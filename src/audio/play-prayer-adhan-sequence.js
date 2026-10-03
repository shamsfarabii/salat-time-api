import { DEFAULT_AUDIO_BASE_DIR } from './config.js';
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
  const resolvedAudioBaseDir = audioBaseDir ?? DEFAULT_AUDIO_BASE_DIR;

  const runSequence = async (
    playOne
  ) => {
    if (startAudioExists(prayer, resolvedAudioBaseDir)) {
    const startContext = {
      prayer,
      time: prayerTime,
      audioKind: 'start',
    };
    const startPath = resolveAudioPath(
      getStartAudioFileName(prayer),
        resolvedAudioBaseDir
    );
    await playOne(startPath, startContext);
    onPlayed?.(startContext);
  }

  const audioFile = audioFiles[prayer] ?? getAdhanAudioFileName(prayer);
  const adhanContext = {
    prayer,
    time: prayerTime,
    audioKind: 'adhan',
  };
  const adhanPath = resolveAudioPath(audioFile, resolvedAudioBaseDir);
  await playOne(adhanPath, adhanContext);
  onPlayed?.(adhanContext);

    return adhanContext;
  };

  if (typeof playAudio.playExclusive === 'function') {
    return playAudio.playExclusive(runSequence);
  }

  return runSequence((filePath, context) => playAudio(filePath, context));
}
