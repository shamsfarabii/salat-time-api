import { computeSalahTimes } from './src/compute.js';
import {
  ADHAN_PRAYERS,
  createNodeAudioPlayer,
  getDefaultAdhanOptions,
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
console.log('Today\'s prayer times:');

for (const prayer of ADHAN_PRAYERS) {
  const time = times[prayer];
  const audio = adhanOptions.audioFiles[prayer];
  console.log(`  ${prayer.padEnd(6)} ${time?.toLocaleTimeString() ?? 'n/a'}  →  ${audio}`);
}

const scheduler = startAdhanScheduler({
  ...adhanOptions,
  playAudio,
  onPlayed: ({ prayer, time }) => {
    console.log(`Playing Adhan for ${prayer} at ${time.toLocaleTimeString()}`);
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
