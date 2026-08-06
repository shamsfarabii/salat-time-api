import {
  MASJID_MINUTES_BEFORE_JAMAAT,
  createNodeAudioPlayer,
  getDefaultAdhanOptions,
  getMasjidAudioFileName,
  startJamaatReminderScheduler,
} from './src/audio/index.js';
import { formatJamaatClock } from './src/db/constants.js';
import { getAllJamaatTimes, listJamaatTimes } from './src/db/index.js';
import {
  buildMasjidSchedules,
  getReminderTimeForToday,
} from './src/audio/jamaat-time-utils.js';

const adhanOptions = getDefaultAdhanOptions();
const playAudio = createNodeAudioPlayer();
const now = new Date();

const jamaatTimes = getAllJamaatTimes().filter((entry) => entry.isSet);
const masjidSchedules = buildMasjidSchedules(
  listJamaatTimes({ includeDisabled: false }),
  adhanOptions.audioBaseDir
);

console.log('Jamaat Masjid reminder scheduler started');
console.log(`Masjid audio plays ${MASJID_MINUTES_BEFORE_JAMAAT} minutes before each jamaat time`);
console.log('Jamaat times:');

if (jamaatTimes.length === 0) {
  console.log('  (none configured — use: npm run jamaat -- set jamat fajr 5:55AM)');
} else {
  for (const jamaatTime of jamaatTimes) {
    const schedule = masjidSchedules.find((entry) => entry.prayer === jamaatTime.prayer);

    if (!schedule) {
      console.log(
        `  ${jamaatTime.prayer.padEnd(6)} jamaat ${jamaatTime.formatted}  →  ${getMasjidAudioFileName(jamaatTime.prayer)} (missing)`
      );
      continue;
    }

    const reminderTime = getReminderTimeForToday(now, schedule);
    console.log(
      `  ${jamaatTime.prayer.padEnd(6)} ${formatJamaatClock(reminderTime.getHours(), reminderTime.getMinutes())}  ${schedule.audioFile}  →  jamaat ${jamaatTime.formatted}`
    );
  }
}

const scheduler = startJamaatReminderScheduler({
  audioBaseDir: adhanOptions.audioBaseDir,
  playAudio,
  onPlayed: ({ prayer, reminderTime, minutesBefore }) => {
    console.log(
      `Playing Masjid reminder for ${prayer} at ${reminderTime.toLocaleTimeString()} (${minutesBefore} min before jamaat)`
    );
  },
  onError: (error) => {
    console.error('Jamaat Masjid playback failed:', error);
  },
});

process.on('SIGINT', () => {
  scheduler.stop();
  console.log('\nJamaat Masjid reminder scheduler stopped');
  process.exit(0);
});
