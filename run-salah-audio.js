import { computeSalahTimes } from './src/compute.js';
import {
  ADHAN_PRAYERS,
  MASJID_MINUTES_BEFORE_JAMAAT,
  SPECIAL_TIME_EVENTS,
  START_SECONDS_BEFORE_ADHAN,
  createNodeAudioPlayer,
  getAdhanAudioFileName,
  getDefaultAdhanOptions,
  getMasjidAudioFileName,
  getSpecialTimeAudioFileName,
  getStartAudioFileName,
  resolveAdhanSalahTimes,
  resolveSpecialSalahTimes,
  startAdhanScheduler,
  startJamaatReminderScheduler,
  startSpecialTimeScheduler,
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

const computedTimes = computeSalahTimes(now, {
  latitude: adhanOptions.latitude,
  longitude: adhanOptions.longitude,
});

const salahTimes = resolveAdhanSalahTimes(computedTimes, adhanOptions.asrMadhab);
const specialTimes = resolveSpecialSalahTimes(computedTimes, {
  now,
  latitude: adhanOptions.latitude,
  longitude: adhanOptions.longitude,
});

const jamaatTimes = getAllJamaatTimes().filter((entry) => entry.isSet);
const masjidSchedules = buildMasjidSchedules(
  listJamaatTimes({ includeDisabled: false }),
  adhanOptions.audioBaseDir
);

console.log('Salah audio scheduler started');
console.log(`Location: ${adhanOptions.latitude}, ${adhanOptions.longitude}`);

console.log('\nAdhan schedule (Start → Adhan):');
for (const prayer of ADHAN_PRAYERS) {
  const adhanTime = salahTimes[prayer];
  const startTime = adhanTime
    ? new Date(adhanTime.getTime() - START_SECONDS_BEFORE_ADHAN * 1000)
    : null;

  console.log(
    `  ${prayer.padEnd(6)} ${startTime?.toLocaleTimeString() ?? 'n/a'}  ${getStartAudioFileName(prayer)}  →  ${adhanTime?.toLocaleTimeString() ?? 'n/a'}  ${getAdhanAudioFileName(prayer)}`
  );
}

console.log('\nSpecial time cues (rise / night2 / ishraq):');
for (const event of SPECIAL_TIME_EVENTS) {
  const eventTime = specialTimes[event];
  console.log(
    `  ${event.padEnd(8)} ${eventTime?.toLocaleTimeString() ?? 'n/a'}  ${getSpecialTimeAudioFileName(event)}`
  );
}

console.log(`\nJamaat Masjid reminders (${MASJID_MINUTES_BEFORE_JAMAAT} min before jamaat):`);
if (jamaatTimes.length === 0) {
  console.log('  (none configured — use: npm run jamaat -- set jamat fajr 5:55AM)');
} else {
  for (const jamaatTime of jamaatTimes) {
    const schedule = masjidSchedules.find((entry) => entry.prayer === jamaatTime.prayer);
    if (!schedule) {
      console.log(`  ${jamaatTime.prayer.padEnd(6)} jamaat ${jamaatTime.formatted}  →  ${getMasjidAudioFileName(jamaatTime.prayer)} (missing)`);
      continue;
    }

    const reminderTime = getReminderTimeForToday(now, schedule);
    console.log(
      `  ${jamaatTime.prayer.padEnd(6)} ${formatJamaatClock(reminderTime.getHours(), reminderTime.getMinutes())}  ${schedule.audioFile}  →  jamaat ${jamaatTime.formatted}`
    );
  }
}

const adhanScheduler = startAdhanScheduler({
  ...adhanOptions,
  playAudio,
  onPlayed: ({ prayer, time, audioKind }) => {
    const label = audioKind === 'start' ? 'Start cue' : 'Adhan';
    console.log(`Playing ${label} for ${prayer} at ${time.toLocaleTimeString()}`);
  },
  onError: (error) => {
    console.error('Adhan playback failed:', error);
  },
});

const jamaatScheduler = startJamaatReminderScheduler({
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

const specialTimeScheduler = startSpecialTimeScheduler({
  latitude: adhanOptions.latitude,
  longitude: adhanOptions.longitude,
  audioBaseDir: adhanOptions.audioBaseDir,
  playAudio,
  onPlayed: ({ event, time }) => {
    console.log(`Playing ${event} cue at ${time.toLocaleTimeString()}`);
  },
  onError: (error) => {
    console.error('Special time playback failed:', error);
  },
});

process.on('SIGINT', () => {
  adhanScheduler.stop();
  jamaatScheduler.stop();
  specialTimeScheduler.stop();
  console.log('\nSalah audio scheduler stopped');
  process.exit(0);
});
