import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADHAN_PRAYERS } from './constants.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_LOCATION = {
  latitude: 23.81223087120777,
  longitude: 90.3894695601623,
};

export const DEFAULT_ASR_MADHAB = 'hanafi';

/** Fajr uses its own recording; all other daily prayers share one Adhan. */
export const DEFAULT_ADHAN_AUDIO_FILES = {
  fajr: 'Fajr.mp3',
  zuhr: 'OtherAdhan.mp3',
  asr: 'OtherAdhan.mp3',
  magrib: 'OtherAdhan.mp3',
  isha: 'OtherAdhan.mp3',
};

export const DEFAULT_AUDIO_BASE_DIR = path.join(packageRoot, 'assets/audio');

/**
 * @param {Record<string, unknown>} [overrides]
 * @returns {{
 *   latitude: number,
 *   longitude: number,
 *   audioFiles: Record<string, string>,
 *   audioBaseDir: string,
 *   prayers: string[],
 *   asrMadhab: 'standard' | 'hanafi',
 * }}
 */
export function getDefaultAdhanOptions(overrides = {}) {
  return {
    ...DEFAULT_LOCATION,
    audioFiles: DEFAULT_ADHAN_AUDIO_FILES,
    audioBaseDir: DEFAULT_AUDIO_BASE_DIR,
    prayers: ADHAN_PRAYERS,
    asrMadhab: DEFAULT_ASR_MADHAB,
    ...overrides,
  };
}
