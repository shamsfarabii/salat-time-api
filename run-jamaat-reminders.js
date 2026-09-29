import {
  MAGRIB_MASJID_MINUTES_BEFORE_WAQT,
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
  resolveMasjidReferenceTimeForToday,
} from './src/audio/jamaat-time-utils.js';

const adhanOptions = getDefaultAdhanOptions();
const location = {
  latitude: adhanOptions.latitude,
  longitude: adhanOptions.longitude,
};
const playAudio = createNodeAudioPlayer();
const now = new Date();

const jamaatTimes = getAllJamaatTimes().filter((entry) => entry.isSet);
const masjidSchedules = buildMasjidSchedules(
  listJamaatTimes({ includeDisabled: false }),
  adhanOptions.audioBaseDir
);

console.log('Jamaat Masjid reminder scheduler started');
console.log(
  `Masjid audio: ${MASJID_MINUTES_BEFORE_JAMAAT} min before jamaat; magrib ${MAGRIB_MASJID_MINUTES_BEFORE_WAQT} min before waqt`
);
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

    const reminderTime = getReminderTimeForToday(now, schedule, location);

    if (jamaatTime.prayer === 'magrib') {
      const magribWaqt = resolveMasjidReferenceTimeForToday(now, schedule, location);
      const waqtLabel = formatJamaatClock(magribWaqt.getHours(), magribWaqt.getMinutes());

      console.log(
        `  ${jamaatTime.prayer.padEnd(6)} ${formatJamaatClock(reminderTime.getHours(), reminderTime.getMinutes())}  ${schedule.audioFile}  →  waqt ${waqtLabel}`
      );
      continue;
    }

    console.log(
      `  ${jamaatTime.prayer.padEnd(6)} ${formatJamaatClock(reminderTime.getHours(), reminderTime.getMinutes())}  ${schedule.audioFile}  →  jamaat ${jamaatTime.formatted}`
    );
  }
}

const scheduler = startJamaatReminderScheduler({
  latitude: adhanOptions.latitude,
  longitude: adhanOptions.longitude,
  audioBaseDir: adhanOptions.audioBaseDir,
  playAudio,
  onPlayed: ({ prayer, reminderTime, minutesBefore }) => {
    const reference = prayer === 'magrib' ? 'waqt' : 'jamaat';
    console.log(
      `Playing Masjid reminder for ${prayer} at ${reminderTime.toLocaleTimeString()} (${minutesBefore} min before ${reference})`
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
