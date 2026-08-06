import { computeSalahTimes } from './src/compute.js';
import {
  ADHAN_PRAYERS,
  START_SECONDS_BEFORE_ADHAN,
  createNodeAudioPlayer,
  getAdhanAudioFileName,
  getDefaultAdhanOptions,
  getStartAudioFileName,
  resolveAdhanSalahTimes,
  startAdhanScheduler,
} from './src/audio/index.js';

const adhanOptions = getDefaultAdhanOptions();
const playAudio = createNodeAudioPlayer();

const times = resolveAdhanSalahTimes(
  computeSalahTimes(new Date(), {
    latitude: adhanOptions.latitude,
    longitude: adhanOptions.longitude,
  }),
  adhanOptions.asrMadhab
);

console.log('Adhan scheduler started');
console.log(`Location: ${adhanOptions.latitude}, ${adhanOptions.longitude}`);
console.log(`Start cue plays ${START_SECONDS_BEFORE_ADHAN} seconds before each adhan`);
console.log('Today\'s schedule:');

for (const prayer of ADHAN_PRAYERS) {
  const adhanTime = times[prayer];
  const startTime = adhanTime
    ? new Date(adhanTime.getTime() - START_SECONDS_BEFORE_ADHAN * 1000)
    : null;

  console.log(
    `  ${prayer.padEnd(6)} ${startTime?.toLocaleTimeString() ?? 'n/a'}  ${getStartAudioFileName(prayer)}  →  ${adhanTime?.toLocaleTimeString() ?? 'n/a'}  ${getAdhanAudioFileName(prayer)}`
  );
}

const scheduler = startAdhanScheduler({
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

process.on('SIGINT', () => {
  scheduler.stop();
  console.log('\nAdhan scheduler stopped');
  process.exit(0);
});
