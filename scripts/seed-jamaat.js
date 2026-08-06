import {
  DEFAULT_DB_PATH,
  getDb,
  upsertJamaatTime,
} from '../src/db/index.js';

/** Example daily jamaat schedule — adjust to your mosque's times. */
const EXAMPLE_JAMAAT_TIMES = [
  { prayer: 'fajr', hours: 5, minutes: 30 },
  { prayer: 'zuhr', hours: 13, minutes: 15 },
  { prayer: 'asr', hours: 16, minutes: 45 },
  { prayer: 'magrib', hours: 18, minutes: 35 },
  { prayer: 'isha', hours: 20, minutes: 0 },
];

getDb();

console.log('Seeding jamaat times');

for (const entry of EXAMPLE_JAMAAT_TIMES) {
  upsertJamaatTime({
    prayer: entry.prayer,
    hours: entry.hours,
    minutes: entry.minutes,
    enabled: true,
  });

  console.log(`  ${entry.prayer.padEnd(6)} jamaat ${formatClock(entry.hours, entry.minutes)}`);
}

console.log('\nSeed complete.');
console.log(`Database: ${DEFAULT_DB_PATH}`);
console.log('Masjid audio is mapped automatically from assets/audio.');
console.log('Run `npm run jamaat -- all jamat time` to view saved times.');

/**
 * @param {number} hours
 * @param {number} minutes
 */
function formatClock(hours, minutes) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString();
}
