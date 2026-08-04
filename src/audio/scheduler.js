import { computeSalahTimes } from '../compute.js';
import { truncateToMinute } from '../utils/time-match.js';
import { ADHAN_PRAYERS } from './constants.js';
import { DEFAULT_ADHAN_AUDIO_FILES, DEFAULT_ASR_MADHAB } from './config.js';
import { getMatchingAdhanPrayer } from './get-matching-adhan.js';
import { resolveAdhanSalahTimes } from './resolve-adhan-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';

/**
 * @typedef {Object} AdhanSchedulerOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {number} [intervalMs=60000] How often to poll for a matching prayer time
 * @property {Record<string, string>} [audioFiles]
 * @property {string} [audioBaseDir]
 * @property {string[]} [prayers]
 * @property {(filePath: string, context: { prayer: string, time: Date }) => Promise<void>} playAudio
 * @property {(result: { prayer: string, time: Date }) => void} [onPlayed]
 * @property {(error: unknown) => void} [onError]
 * @property {'standard' | 'hanafi'} [asrMadhab]
 */

/**
 * Poll at a fixed interval and play Adhan audio when the current minute matches a salah time.
 * Skips duplicate playback for the same prayer within the same minute.
 *
 * @param {AdhanSchedulerOptions} options
 * @returns {{ stop: () => void, checkNow: () => Promise<{ prayer: string, time: Date } | null> }}
 */
export function startAdhanScheduler({
  latitude,
  longitude,
  intervalMs = 60_000,
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

  let lastPlayedKey = null;
  let timerId = null;

  const checkNow = async () => {
    const now = new Date();
    const salahTimes = resolveAdhanSalahTimes(
      computeSalahTimes(now, { latitude, longitude }),
      asrMadhab
    );
    const prayer = getMatchingAdhanPrayer(now, salahTimes, prayers);

    if (!prayer) {
      return null;
    }

    const playKey = `${prayer}-${truncateToMinute(now)}`;
    if (playKey === lastPlayedKey) {
      return null;
    }

    const audioFile = audioFiles[prayer];
    if (!audioFile) {
      throw new Error(`No audio file configured for prayer: ${prayer}`);
    }

    const prayerTime = salahTimes[prayer];
    if (!(prayerTime instanceof Date) || Number.isNaN(prayerTime.getTime())) {
      throw new Error(`Computed time for ${prayer} is invalid`);
    }

    const resolvedPath = resolveAudioPath(audioFile, audioBaseDir);
    await playAudio(resolvedPath, { prayer, time: prayerTime });

    lastPlayedKey = playKey;
    const result = { prayer, time: prayerTime };
    onPlayed?.(result);
    return result;
  };

  const runTick = () => {
    checkNow().catch((error) => {
      onError?.(error);
    });
  };

  timerId = setInterval(runTick, intervalMs);

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
