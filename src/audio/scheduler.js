import { computeSalahTimes } from '../compute.js';
import { isSameMinute, truncateToMinute } from '../utils/time-match.js';
import { ADHAN_PRAYERS } from './constants.js';
import { DEFAULT_ADHAN_AUDIO_FILES, DEFAULT_ASR_MADHAB } from './config.js';
import { resolveAdhanSalahTimes } from './resolve-adhan-times.js';
import { playStartThenAdhan } from './play-prayer-adhan-sequence.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';

/**
 * @typedef {Object} AdhanSchedulerOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} [intervalMs=1000] How often to poll for Start/Adhan playback
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
 * Poll at a fixed interval; at each prayer time play Start audio, then Adhan when Start ends.
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
  intervalMs = 1000,
  audioFiles = DEFAULT_ADHAN_AUDIO_FILES,
  audioBaseDir,
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
  let timerId = null;

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
