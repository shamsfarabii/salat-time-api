import { computeSalahTimes } from '../compute.js';
import {
  isSameMinute,
  isSameSecond,
  truncateToMinute,
  truncateToSecond,
} from '../utils/time-match.js';
import { ADHAN_PRAYERS } from './constants.js';
import { DEFAULT_ADHAN_AUDIO_FILES, DEFAULT_ASR_MADHAB } from './config.js';
import { resolveAdhanSalahTimes } from './resolve-adhan-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import {
  START_SECONDS_BEFORE_ADHAN,
  getAdhanAudioFileName,
  getStartAudioFileName,
  startAudioExists,
} from './prayer-audio-files.js';

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
 * Poll at a fixed interval, play Start audio 4 seconds before adhan, then adhan at salah time.
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
      const adhanTime = salahTimes[prayer];
      if (!(adhanTime instanceof Date) || Number.isNaN(adhanTime.getTime())) {
        continue;
      }

      const startTime = new Date(
        adhanTime.getTime() - START_SECONDS_BEFORE_ADHAN * 1000
      );

      if (
        startAudioExists(prayer, audioBaseDir) &&
        isSameSecond(now, startTime)
      ) {
        const playKey = `${prayer}-start-${truncateToSecond(now)}`;
        if (!playedKeys.has(playKey)) {
          const startFile = getStartAudioFileName(prayer);
          const resolvedPath = resolveAudioPath(startFile, audioBaseDir);
          await playAudio(resolvedPath, {
            prayer,
            time: startTime,
            audioKind: 'start',
          });

          playedKeys.add(playKey);
          lastResult = { prayer, time: startTime, audioKind: 'start' };
          onPlayed?.(lastResult);
        }
      }

      if (isSameMinute(now, adhanTime)) {
        const playKey = `${prayer}-adhan-${truncateToMinute(now)}`;
        if (!playedKeys.has(playKey)) {
          const audioFile = audioFiles[prayer] ?? getAdhanAudioFileName(prayer);
          const resolvedPath = resolveAudioPath(audioFile, audioBaseDir);
          await playAudio(resolvedPath, {
            prayer,
            time: adhanTime,
            audioKind: 'adhan',
          });

          playedKeys.add(playKey);
          lastResult = { prayer, time: adhanTime, audioKind: 'adhan' };
          onPlayed?.(lastResult);
        }
      }
    }

    return lastResult;
  };

  const runTick = () => {
    checkNow().catch((error) => {
      onError?.(error);
    });
  };

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
