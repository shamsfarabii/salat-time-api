import { computeSalahTimes } from '../compute.js';
import { ADHAN_PRAYERS } from './constants.js';
import { DEFAULT_ADHAN_AUDIO_FILES, DEFAULT_ASR_MADHAB } from './config.js';
import { getMatchingAdhanPrayer } from './get-matching-adhan.js';
import { playStartThenAdhan } from './play-prayer-adhan-sequence.js';
import { resolveAdhanSalahTimes } from './resolve-adhan-times.js';

/**
 * @typedef {Object} CheckAndPlayAdhanOptions
 * @property {number} latitude
 * @property {number} longitude
 * @property {Date} [now]
 * @property {Record<string, string>} [audioFiles]
 * @property {string} [audioBaseDir] Directory containing audio assets
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
 * @property {'standard' | 'hanafi'} [asrMadhab]
 */

/**
 * Compute today's salah times, check whether `now` matches any configured prayer,
 * and play Start then Adhan when it does.
 *
 * @param {CheckAndPlayAdhanOptions} options
 * @returns {Promise<{ prayer: string, time: Date, audioKind: 'start' | 'adhan' } | null>}
 */
export async function checkAndPlayAdhan({
  latitude,
  longitude,
  now = new Date(),
  audioFiles = DEFAULT_ADHAN_AUDIO_FILES,
  audioBaseDir,
  prayers = ADHAN_PRAYERS,
  playAudio,
  onPlayed,
  asrMadhab = DEFAULT_ASR_MADHAB,
}) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('latitude and longitude must be finite numbers');
  }

  if (typeof playAudio !== 'function') {
    throw new Error('playAudio callback is required');
  }

  const salahTimes = resolveAdhanSalahTimes(
    computeSalahTimes(now, { latitude, longitude }),
    asrMadhab
  );
  const prayer = getMatchingAdhanPrayer(now, salahTimes, prayers);

  if (!prayer) {
    return null;
  }

  const prayerTime = salahTimes[prayer];
  if (!(prayerTime instanceof Date) || Number.isNaN(prayerTime.getTime())) {
    throw new Error(`Computed time for ${prayer} is invalid`);
  }

  const audioFile = audioFiles[prayer];
  if (!audioFile) {
    throw new Error(`No audio file configured for prayer: ${prayer}`);
  }

  return playStartThenAdhan({
    prayer,
    prayerTime,
    audioFiles,
    audioBaseDir,
    playAudio,
    onPlayed,
  });
}
