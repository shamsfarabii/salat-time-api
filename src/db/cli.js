import {
  formatJamaatClock,
  JAMAAT_PRAYERS,
  assertJamaatPrayer,
} from './constants.js';
import { getDb } from './client.js';
import {
  listJamaatTimes,
  upsertJamaatTime,
} from './repositories/jamaat-times.js';
import { parseTimeString } from '../utils/parse-time-string.js';

/**
 * @param {string} prayer
 * @param {string} timeInput
 * @returns {{ prayer: string, hours: number, minutes: number, formatted: string }}
 */
export function setJamaatTime(prayer, timeInput) {
  getDb();

  const normalizedPrayer = assertJamaatPrayer(prayer.toLowerCase());
  const { hours, minutes } = parseTimeString(timeInput);

  upsertJamaatTime({
    prayer: normalizedPrayer,
    hours,
    minutes,
    enabled: true,
  });

  return {
    prayer: normalizedPrayer,
    hours,
    minutes,
    formatted: formatJamaatClock(hours, minutes),
  };
}

/**
 * @returns {Array<{
 *   prayer: string,
 *   hours: number | null,
 *   minutes: number | null,
 *   formatted: string,
 *   isSet: boolean,
 *   updatedAt: string | null,
 * }>}
 */
export function getAllJamaatTimes() {
  getDb();

  const savedTimes = listJamaatTimes();
  const savedByPrayer = new Map(savedTimes.map((entry) => [entry.prayer, entry]));

  return JAMAAT_PRAYERS.map((prayer) => {
    const saved = savedByPrayer.get(prayer);

    if (!saved) {
      return {
        prayer,
        hours: null,
        minutes: null,
        formatted: 'not set',
        isSet: false,
        updatedAt: null,
      };
    }

    return {
      prayer,
      hours: saved.hours,
      minutes: saved.minutes,
      formatted: formatJamaatClock(saved.hours, saved.minutes),
      isSet: true,
      updatedAt: saved.updated_at,
    };
  });
}

/**
 * @param {string[]} args
 */
export function runJamaatCli(args) {
  const input = args.join(' ').trim();

  if (!input) {
    printUsage();
    return 1;
  }

  const setMatch = input.match(/^set\s+jamat\s+(\w+)\s+(.+)$/i);
  if (setMatch) {
    try {
      const result = setJamaatTime(setMatch[1], setMatch[2].trim());
      console.log(`Jamaat time saved: ${result.prayer} ${result.formatted}`);
      return 0;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return 1;
    }
  }

  if (/^all\s+jamat\s+times?$/i.test(input)) {
    const entries = getAllJamaatTimes();

    console.log('Jamaat times:');
    for (const entry of entries) {
      console.log(`  ${entry.prayer.padEnd(6)} ${entry.formatted}`);
    }

    return 0;
  }

  printUsage();
  return 1;
}

function printUsage() {
  console.error('Usage:');
  console.error('  npm run jamaat -- set jamat <prayer> <time>');
  console.error('  npm run jamaat -- all jamat time');
  console.error('');
  console.error('Examples:');
  console.error('  npm run jamaat -- set jamat fajr 5:55AM');
  console.error('  npm run jamaat -- set jamat magrib 6:35PM');
  console.error('  npm run jamaat -- all jamat time');
}
