import { isSameMinute, truncateToMinute } from '../utils/time-match.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';

/**
 * @param {number} hours
 * @param {number} minutes
 * @param {Date} [now]
 * @returns {Date}
 */
function buildNextAlarmDate(hours, minutes, now = new Date()) {
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);

  if (truncateToMinute(target) < truncateToMinute(now)) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

/**
 * @param {Date} now
 * @param {number} hours
 * @param {number} minutes
 * @returns {Date}
 */
function buildTodayAlarmDate(now, hours, minutes) {
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

/**
 * @typedef {Object} CustomAlarmOptions
 * @property {number} hours
 * @property {number} minutes
 * @property {string} audioFile
 * @property {string} [audioBaseDir]
 * @property {number} [intervalMs=60000]
 * @property {'once' | 'daily'} [repeat='once']
 * @property {(filePath: string, context: { time: Date }) => Promise<void>} playAudio
 * @property {(result: { time: Date }) => void} [onPlayed]
 * @property {(error: unknown) => void} [onError]
 * @property {(alarmAt: Date, repeat: 'once' | 'daily') => void} [onScheduled]
 */

/**
 * Poll until the current minute matches the alarm time, then play audio.
 * With `repeat: 'daily'`, keeps running and plays every day at the same time.
 *
 * @param {CustomAlarmOptions} options
 * @returns {{ stop: () => void, alarmAt: Date, repeat: 'once' | 'daily' }}
 */
export function startCustomAlarm({
  hours,
  minutes,
  audioFile,
  audioBaseDir,
  intervalMs = 60_000,
  repeat = 'once',
  playAudio,
  onPlayed,
  onError,
  onScheduled,
}) {
  if (typeof playAudio !== 'function') {
    throw new Error('playAudio callback is required');
  }

  if (!audioFile) {
    throw new Error('audioFile is required');
  }

  let timerId = null;
  let lastPlayedKey = null;
  const alarmAt = buildNextAlarmDate(hours, minutes);

  onScheduled?.(alarmAt, repeat);

  const checkNow = async () => {
    const now = new Date();
    const todayAlarm = buildTodayAlarmDate(now, hours, minutes);

    if (!isSameMinute(now, todayAlarm)) {
      return null;
    }

    const playKey = truncateToMinute(now);
    if (playKey === lastPlayedKey) {
      return null;
    }

    lastPlayedKey = playKey;
    const resolvedPath = resolveAudioPath(audioFile, audioBaseDir);

    try {
      await playAudio(resolvedPath, { time: todayAlarm });
    } catch (error) {
      lastPlayedKey = null;
      throw error;
    }

    const result = { time: todayAlarm };
    onPlayed?.(result);
    return result;
  };

  const runTick = createNonOverlappingTickRunner(
    async () => {
      const result = await checkNow();
      if (result && repeat === 'once') {
        stop();
      }
      return result;
    },
    onError
  );

  const stop = () => {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  timerId = setInterval(runTick, intervalMs);
  runTick();

  return { stop, alarmAt, repeat };
}
