import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADHAN_PRAYERS } from '../audio/constants.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const DEFAULT_DB_PATH = path.join(packageRoot, 'data', 'salah-time.db');

/** @typedef {'fajr' | 'zuhr' | 'asr' | 'magrib' | 'isha'} JamaatPrayer */

/** @type {readonly JamaatPrayer[]} */
export const JAMAAT_PRAYERS = ADHAN_PRAYERS;

const JAMAAT_PRAYER_SET = new Set(JAMAAT_PRAYERS);

/**
 * @param {string} prayer
 * @returns {prayer is JamaatPrayer}
 */
export function isJamaatPrayer(prayer) {
  return JAMAAT_PRAYER_SET.has(prayer);
}

/**
 * @param {string} prayer
 * @returns {JamaatPrayer}
 */
export function assertJamaatPrayer(prayer) {
  if (!isJamaatPrayer(prayer)) {
    throw new Error(
      `Invalid prayer "${prayer}". Must be one of: ${JAMAAT_PRAYERS.join(', ')}`
    );
  }

  return prayer;
}

/**
 * @param {number} hours
 * @param {number} minutes
 */
export function assertTimeOfDay(hours, minutes) {
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    throw new Error(`Invalid hours: ${hours}. Must be an integer between 0 and 23`);
  }

  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid minutes: ${minutes}. Must be an integer between 0 and 59`);
  }
}

/**
 * @param {number} minutesBefore
 */
export function assertMinutesBefore(minutesBefore) {
  if (!Number.isInteger(minutesBefore) || minutesBefore <= 0) {
    throw new Error(
      `Invalid minutesBefore: ${minutesBefore}. Must be a positive integer`
    );
  }
}

/**
 * @param {number} hours
 * @param {number} minutes
 * @returns {string}
 */
export function formatJamaatClock(hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(date)
    .replace(/\u202f/g, ' ');
}
