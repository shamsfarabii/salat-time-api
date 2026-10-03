import { computeSalahTimes } from './src/compute.js';
import {
  ADHAN_PRAYERS,
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
console.log('At each prayer time: Start cue, then Adhan when Start ends');
console.log('Today\'s schedule:');

for (const prayer of ADHAN_PRAYERS) {
  const prayerTime = times[prayer];

  console.log(
    `  ${prayer.padEnd(6)} ${prayerTime?.toLocaleTimeString() ?? 'n/a'}  ${getStartAudioFileName(prayer)}  →  ${getAdhanAudioFileName(prayer)}`
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
