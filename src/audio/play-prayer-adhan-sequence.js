import { resolveAudioPath } from './resolve-audio-path.js';
import {
  getAdhanAudioFileName,
  getStartAudioFileName,
  startAudioExists,
} from './prayer-audio-files.js';

/**
 * @typedef {Object} PrayerAdhanPlaybackContext
 * @property {string} prayer
 * @property {Date} time
 * @property {'start' | 'adhan'} audioKind
 */

/**
 * Play the Start cue at prayer time, then the Adhan when Start finishes.
 *
 * @param {Object} options
 * @param {string} options.prayer
 * @param {Date} options.prayerTime
 * @param {Record<string, string>} options.audioFiles
 * @param {string | undefined} options.audioBaseDir
 * @param {(filePath: string, context: PrayerAdhanPlaybackContext) => Promise<void>} options.playAudio
 * @param {(context: PrayerAdhanPlaybackContext) => void} [options.onPlayed]
 * @returns {Promise<PrayerAdhanPlaybackContext>}
 */
export async function playStartThenAdhan({
  prayer,
  prayerTime,
  audioFiles,
  audioBaseDir,
  playAudio,
  onPlayed,
}) {
  if (startAudioExists(prayer, audioBaseDir)) {
    const startContext = {
      prayer,
      time: prayerTime,
      audioKind: 'start',
    };
    const startPath = resolveAudioPath(
      getStartAudioFileName(prayer),
      audioBaseDir
    );
    await playAudio(startPath, startContext);
    onPlayed?.(startContext);
  }

  const audioFile = audioFiles[prayer] ?? getAdhanAudioFileName(prayer);
  const adhanContext = {
    prayer,
    time: prayerTime,
    audioKind: 'adhan',
  };
  const adhanPath = resolveAudioPath(audioFile, audioBaseDir);
  await playAudio(adhanPath, adhanContext);
  onPlayed?.(adhanContext);

  return adhanContext;
}
