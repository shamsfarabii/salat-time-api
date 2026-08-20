import fs from 'node:fs';
import { ADHAN_PRAYERS } from './constants.js';
import { resolveAudioPath } from './resolve-audio-path.js';

/** Minutes before jamaat when the Masjid reminder audio plays. */
export const MASJID_MINUTES_BEFORE_JAMAAT = 10;

/** Seconds before adhan when the Start cue audio plays. */
export const START_SECONDS_BEFORE_ADHAN = 4;

/**
 * Maps internal prayer keys to asset file prefixes and adhan filenames.
 *
 * @type {Record<string, { prefix: string, adhan: string }>}
 */
export const PRAYER_AUDIO_FILE_NAMES = {
  fajr: { prefix: 'Fajr', adhan: 'Fajr.mp3' },
  zuhr: { prefix: 'Dhuhr', adhan: 'OtherAdhan.mp3' },
  asr: { prefix: 'Asr', adhan: 'OtherAdhan.mp3' },
  magrib: { prefix: 'Magrib', adhan: 'OtherAdhan.mp3' },
  isha: { prefix: 'Isha', adhan: 'OtherAdhan.mp3' },
};

/**
 * Maps special time events to Start cue audio filenames.
 *
 * @type {Record<string, string>}
 */
export const SPECIAL_TIME_AUDIO_FILES = {
  sunrise: 'SunriseStart.mp3',
  tahajjud: 'TahajjudStart.mp3',
  ishraq: 'IshrakStart.mp3',
};

/**
 * @param {string} prayer
 * @returns {string}
 */
export function getMasjidAudioFileName(prayer) {
  return `${getPrayerAudioPrefix(prayer)}Masjid.mp3`;
}

/**
 * @param {string} prayer
 * @returns {string}
 */
export function getStartAudioFileName(prayer) {
  return `${getPrayerAudioPrefix(prayer)}Start.mp3`;
}

/**
 * @param {string} event
 * @returns {string}
 */
export function getSpecialTimeAudioFileName(event) {
  const fileName = SPECIAL_TIME_AUDIO_FILES[event];
  if (!fileName) {
    throw new Error(`Unknown special time event: ${event}`);
  }

  return fileName;
}

/**
 * @param {string} event
 * @param {string | undefined} audioBaseDir
 * @returns {boolean}
 */
export function specialTimeAudioExists(event, audioBaseDir) {
  return audioFileExists(getSpecialTimeAudioFileName(event), audioBaseDir);
}

/**
 * @param {string} prayer
 * @returns {string}
 */
export function getAdhanAudioFileName(prayer) {
  const entry = PRAYER_AUDIO_FILE_NAMES[prayer];
  if (!entry) {
    throw new Error(`Unknown prayer: ${prayer}`);
  }

  return entry.adhan;
}

/**
 * @returns {Record<string, string>}
 */
export function buildDefaultAdhanAudioFiles() {
  return Object.fromEntries(
    ADHAN_PRAYERS.map((prayer) => [prayer, getAdhanAudioFileName(prayer)])
  );
}

/**
 * @param {string} prayer
 * @param {string | undefined} audioBaseDir
 * @returns {boolean}
 */
export function masjidAudioExists(prayer, audioBaseDir) {
  return audioFileExists(getMasjidAudioFileName(prayer), audioBaseDir);
}

/**
 * @param {string} prayer
 * @param {string | undefined} audioBaseDir
 * @returns {boolean}
 */
export function startAudioExists(prayer, audioBaseDir) {
  return audioFileExists(getStartAudioFileName(prayer), audioBaseDir);
}

/**
 * @param {string} fileName
 * @param {string | undefined} audioBaseDir
 * @returns {boolean}
 */
export function audioFileExists(fileName, audioBaseDir) {
  const resolvedPath = resolveAudioPath(fileName, audioBaseDir);
  return fs.existsSync(resolvedPath);
}

/**
 * @param {string} prayer
 * @returns {string}
 */
function getPrayerAudioPrefix(prayer) {
  const entry = PRAYER_AUDIO_FILE_NAMES[prayer];
  if (!entry) {
    throw new Error(`Unknown prayer: ${prayer}`);
  }

  return entry.prefix;
}
