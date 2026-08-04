import fs from 'node:fs';
import {
  createNodeAudioPlayer,
  DEFAULT_AUDIO_BASE_DIR,
  resolveAudioPath,
  startCustomAlarm,
} from './src/audio/index.js';
import { parseTimeString } from './src/utils/parse-time-string.js';

const args = process.argv.slice(2);
const isDaily = args.includes('--daily');
const positional = args.filter((arg) => arg !== '--daily');
const [timeArg, audioArg] = positional;

if (!timeArg || !audioArg) {
  console.error('Usage: npm run set -- <Time> <AdhanFileName.mp3> [--daily]');
  console.error('Example: npm run set -- 11:50PM Fajr.mp3');
  console.error('Example: npm run set -- 11:50PM Fajr.mp3 --daily');
  process.exit(1);
}

let hours;
let minutes;

try {
  ({ hours, minutes } = parseTimeString(timeArg));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

const audioPath = resolveAudioPath(audioArg, DEFAULT_AUDIO_BASE_DIR);

if (!fs.existsSync(audioPath)) {
  console.error(`Audio file not found: ${audioPath}`);
  process.exit(1);
}

const playAudio = createNodeAudioPlayer();
const repeat = isDaily ? 'daily' : 'once';

const alarm = startCustomAlarm({
  hours,
  minutes,
  audioFile: audioArg,
  audioBaseDir: DEFAULT_AUDIO_BASE_DIR,
  repeat,
  playAudio,
  onScheduled: (alarmAt, alarmRepeat) => {
    const timeLabel = alarmAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (alarmRepeat === 'daily') {
      console.log(`Daily alarm set for ${timeLabel}`);
      console.log(`Audio: ${audioArg}`);
      console.log('Repeats every day. Press Ctrl+C to stop.');
      return;
    }

    console.log(`Custom alarm set for ${alarmAt.toLocaleString()}`);
    console.log(`Audio: ${audioArg}`);
  },
  onPlayed: ({ time }) => {
    console.log(`Playing alarm at ${time.toLocaleTimeString()}`);

    if (repeat === 'once') {
      process.exit(0);
    }
  },
  onError: (error) => {
    console.error('Alarm playback failed:', error);
    process.exit(1);
  },
});

process.on('SIGINT', () => {
  alarm.stop();
  console.log('\nCustom alarm cancelled');
  process.exit(0);
});
