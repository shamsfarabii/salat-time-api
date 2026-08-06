import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADHAN_PRAYERS } from './constants.js';
import { buildDefaultAdhanAudioFiles } from './prayer-audio-files.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_LOCATION = {
  latitude: 23.81223087120777,
  longitude: 90.3894695601623,
};

export const DEFAULT_ASR_MADHAB = 'hanafi';

/** Adhan filenames derived from assets/audio naming convention. */
export const DEFAULT_ADHAN_AUDIO_FILES = buildDefaultAdhanAudioFiles();

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
