import { computeSalahTimes } from '../compute.js';
import { isSameMinute, truncateToMinute } from '../utils/time-match.js';
import { ADHAN_PRAYERS } from './constants.js';
import {
  DEFAULT_ADHAN_AUDIO_FILES,
  DEFAULT_ASR_MADHAB,
  DEFAULT_AUDIO_BASE_DIR,
} from './config.js';
import { resolveAdhanSalahTimes } from './resolve-adhan-times.js';
import { playStartThenAdhan } from './play-prayer-adhan-sequence.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';
import {
  createDeferredTimer,
  delayUntil,
  startOfNextLocalDay,
} from './event-timer.js';

/**
 * @typedef {Object} AdhanSchedulerOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {Record<string, string>} [audioFiles]
 * @property {string} [audioBaseDir]
 * @property {string[]} [prayers]
 * @property {(filePath: string, context: {
 *   prayer: string,
 *   time: Date,
 *   audioKind: 'start' | 'adhan',
 * }) => Promise<void>} playAudio
 * @property {(result: {
 *   prayer: string,
 *   time: Date,
 *   audioKind: 'start' | 'adhan',
 * }) => void} [onPlayed]
 * @property {(error: unknown) => void} [onError]
 * @property {'standard' | 'hanafi'} [asrMadhab]
 */

/**
 * @param {Date} referenceDate
 * @param {number} latitude
 * @param {number} longitude
 * @param {'standard' | 'hanafi'} asrMadhab
 * @param {string[]} prayers
 * @returns {Array<{ prayer: string, time: Date }>}
 */
function getOrderedPrayerEvents(referenceDate, latitude, longitude, asrMadhab, prayers) {
  const salahTimes = resolveAdhanSalahTimes(
    computeSalahTimes(referenceDate, { latitude, longitude }),
    asrMadhab
  );

  return prayers
    .map((prayer) => {
      const time = salahTimes[prayer];
      if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
        return null;
      }

      return { prayer, time };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.time.getTime() - b.time.getTime());
}

/**
 * At each prayer time play Start audio, then Adhan when Start ends.
 * Uses a single timer until the next event instead of polling the clock.
 *
 * @param {AdhanSchedulerOptions} options
 * @returns {{ stop: () => void, checkNow: () => Promise<{
 *   prayer: string,
 *   time: Date,
 *   audioKind: 'start' | 'adhan',
 * } | null> }}
 */
export function startAdhanScheduler({
  latitude,
  longitude,
  audioFiles = DEFAULT_ADHAN_AUDIO_FILES,
  audioBaseDir = DEFAULT_AUDIO_BASE_DIR,
  prayers = ADHAN_PRAYERS,
  playAudio,
  onPlayed,
  onError,
  asrMadhab = DEFAULT_ASR_MADHAB,
}) {
  if (typeof playAudio !== 'function') {
    throw new Error('playAudio callback is required');
  }

  const playedKeys = new Set();
  const timer = createDeferredTimer();

  const checkNow = async () => {
    const now = new Date();
    const salahTimes = resolveAdhanSalahTimes(
      computeSalahTimes(now, { latitude, longitude }),
      asrMadhab
    );

    /** @type {{ prayer: string, time: Date, audioKind: 'start' | 'adhan' } | null} */
    let lastResult = null;

    for (const prayer of prayers) {
      const prayerTime = salahTimes[prayer];
      if (!(prayerTime instanceof Date) || Number.isNaN(prayerTime.getTime())) {
        continue;
      }

      if (!isSameMinute(now, prayerTime)) {
        continue;
      }

      const playKey = `${prayer}-${truncateToMinute(prayerTime)}`;
      if (playedKeys.has(playKey)) {
        continue;
      }

      playedKeys.add(playKey);

      try {
        const result = await playStartThenAdhan({
          prayer,
          prayerTime,
          audioFiles,
          audioBaseDir,
          playAudio,
          onPlayed,
        });
        lastResult = result;
      } catch (error) {
        playedKeys.delete(playKey);
        throw error;
      }
    }

    return lastResult;
  };

  const armNextWake = () => {
    if (timer.stopped) {
      return;
    }

    const now = new Date();
    const nowMinute = truncateToMinute(now);
    const dayEvents = getOrderedPrayerEvents(now, latitude, longitude, asrMadhab, prayers);

    for (const event of dayEvents) {
      const eventMinute = truncateToMinute(event.time);
      if (eventMinute < nowMinute) {
        continue;
      }

      const playKey = `${event.prayer}-${eventMinute}`;
      if (eventMinute === nowMinute && playedKeys.has(playKey)) {
        continue;
      }

      const wakeAt = new Date(eventMinute);
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