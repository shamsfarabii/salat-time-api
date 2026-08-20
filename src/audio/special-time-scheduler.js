import { computeSalahTimes } from '../compute.js';
import { isSameMinute, truncateToMinute } from '../utils/time-match.js';
import { SPECIAL_TIME_EVENTS } from './constants.js';
import { resolveSpecialSalahTimes } from './resolve-special-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import {
  getSpecialTimeAudioFileName,
  specialTimeAudioExists,
} from './prayer-audio-files.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';

/**
 * @typedef {Object} SpecialTimeSchedulerOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} [intervalMs=60000] How often to poll for special-time playback
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
 * Poll at a fixed interval and play Start cue audio at sunrise, tahajjud (night2), and ishraq.
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
  intervalMs = 60_000,
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
  let timerId = null;

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
      computeSalahTimes(now, { latitude, longitude })
    );

    /** @type {{ event: string, time: Date, audioKind: 'special' } | null} */
    let lastResult = null;

    for (const event of events) {
      const eventTime = specialTimes[event];
      if (!(eventTime instanceof Date) || Number.isNaN(eventTime.getTime())) {
        continue;
      }

      if (!specialTimeAudioExists(event, audioBaseDir)) {
        continue;
      }

      if (!isSameMinute(now, eventTime)) {
        continue;
      }

      const playKey = `${event}-special-${truncateToMinute(now)}`;
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

  const runTick = createNonOverlappingTickRunner(checkNow, onError);

  timerId = setInterval(runTick, intervalMs);
  runTick();

  return {
    stop: () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    },
    checkNow,
  };
}
