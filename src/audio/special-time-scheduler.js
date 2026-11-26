import { computeSalahTimes } from '../compute.js';
import { isSameSecond, truncateToSecond } from '../utils/time-match.js';
import { SPECIAL_TIME_EVENTS } from './constants.js';
import { resolveSpecialSalahTimes } from './resolve-special-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import {
  getSpecialTimeAudioFileName,
  specialTimeAudioExists,
} from './prayer-audio-files.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';
import {
  createDeferredTimer,
  delayUntil,
  startOfNextLocalDay,
} from './event-timer.js';

/**
 * @typedef {Object} SpecialTimeSchedulerOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {string} [audioBaseDir]
 * @property {string[]} [events]
 * @property {(filePath: string, context: {
 *   event: string,
 *   time: Date,
 *   audioKind: 'special',
 * }) => Promise<void>} playAudio
 * @property {(result: {
 *   event: string,
 *   time: Date,
 *   audioKind: 'special',
 * }) => void} [onPlayed]
 * @property {(error: unknown) => void} [onError]
 */

/**
 * @param {string[]} events
 * @param {string | undefined} audioBaseDir
 * @returns {string[]}
 */
function filterEventsWithAudio(events, audioBaseDir) {
  return events.filter((event) => specialTimeAudioExists(event, audioBaseDir));
}

/**
 * @param {Date} referenceDate
 * @param {number} latitude
 * @param {number} longitude
 * @param {string[]} eventsWithAudio
 * @returns {Array<{ event: string, time: Date }>}
 */
function getOrderedSpecialEvents(referenceDate, latitude, longitude, eventsWithAudio) {
  const specialTimes = resolveSpecialSalahTimes(
    computeSalahTimes(referenceDate, { latitude, longitude }),
    { now: referenceDate, latitude, longitude }
  );

  return eventsWithAudio
    .map((event) => {
      const time = specialTimes[event];
      if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
        return null;
      }

      return { event, time };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * Play Start cue audio at sunrise, tahajjud, and ishraq.
 * Uses a single timer until the next event instead of polling the clock.
 *
 * @param {SpecialTimeSchedulerOptions} options
 * @returns {{ stop: () => void, checkNow: () => Promise<{
 *   event: string,
 *   time: Date,
 *   audioKind: 'special',
 * } | null> }}
 */
export function startSpecialTimeScheduler({
  latitude,
  longitude,
  audioBaseDir,
  events = SPECIAL_TIME_EVENTS,
  playAudio,
  onPlayed,
  onError,
}) {
  if (typeof playAudio !== 'function') {
    throw new Error('playAudio callback is required');
  }

  const playedKeys = new Set();
  const timer = createDeferredTimer();
  const schedulableEvents = filterEventsWithAudio(events, audioBaseDir);

  /**
   * @param {string} playKey
   * @param {string} resolvedPath
   * @param {{ event: string, time: Date, audioKind: 'special' }} context
   * @returns {Promise<{ event: string, time: Date, audioKind: 'special' } | null>}
   */
  const playOnce = async (playKey, resolvedPath, context) => {
    if (playedKeys.has(playKey)) {
      return null;
    }

    playedKeys.add(playKey);

    try {
      await playAudio(resolvedPath, context);
    } catch (error) {
      playedKeys.delete(playKey);
      throw error;
    }

    onPlayed?.(context);
    return context;
  };

  const checkNow = async () => {
    const now = new Date();
    const specialTimes = resolveSpecialSalahTimes(
      computeSalahTimes(now, { latitude, longitude }),
      { now, latitude, longitude }
    );

    /** @type {{ event: string, time: Date, audioKind: 'special' } | null} */
    let lastResult = null;

    for (const event of schedulableEvents) {
      const eventTime = specialTimes[event];
      if (!(eventTime instanceof Date) || Number.isNaN(eventTime.getTime())) {
        continue;
      }

      if (!isSameSecond(now, eventTime)) {
        continue;
      }

      const playKey = `${event}-special-${truncateToSecond(now)}`;
      const audioFile = getSpecialTimeAudioFileName(event);
      const resolvedPath = resolveAudioPath(audioFile, audioBaseDir);
      const result = await playOnce(playKey, resolvedPath, {
        event,
        time: eventTime,
        audioKind: 'special',
      });

      if (result) {
        lastResult = result;
      }
    }

    return lastResult;
  };

  const armNextWake = () => {
    if (timer.stopped) {
      return;
    }

    const now = new Date();
    const nowSecond = truncateToSecond(now);
    const dayEvents = getOrderedSpecialEvents(now, latitude, longitude, schedulableEvents);

    for (const event of dayEvents) {
      const eventSecond = truncateToSecond(event.time);
      if (eventSecond < nowSecond) {
        continue;
      }

      const playKey = `${event.event}-special-${eventSecond}`;
      if (eventSecond === nowSecond && playedKeys.has(playKey)) {
        continue;
      }

      const wakeAt = new Date(eventSecond);
      timer.schedule(delayUntil(wakeAt, now), runWake);
      return;
    }

    const nextDay = startOfNextLocalDay(now);
    timer.schedule(delayUntil(nextDay, now) + 1_000, runWake);
  };

  const runWake = createNonOverlappingTickRunner(async () => {
    await checkNow();
    armNextWake();
  }, onError);

  armNextWake();

  return {
    stop: () => {
      timer.stop();
    },
    checkNow,
  };
}