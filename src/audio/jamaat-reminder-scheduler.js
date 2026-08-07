import { truncateToMinute } from '../utils/time-match.js';
import { listJamaatTimes } from '../db/repositories/jamaat-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import {
  buildMasjidSchedules,
  getMatchingJamaatReminder,
  getReminderTimeForToday,
} from './jamaat-time-utils.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';

/**
 * @typedef {Object} JamaatReminderSchedulerOptions
 * @property {number} [intervalMs=60000] How often to poll for a matching reminder time
 * @property {string} [audioBaseDir]
 * @property {string} [dbPath]
 * @property {(filePath: string, context: {
 *   prayer: string,
 *   reminderTime: Date,
 *   jamaatTime: Date,
 *   minutesBefore: number,
 *   reminderId: string,
 *   audioKind: 'masjid',
 * }) => Promise<void>} playAudio
 * @property {(result: {
 *   prayer: string,
 *   reminderTime: Date,
 *   jamaatTime: Date,
 *   minutesBefore: number,
 *   reminderId: string,
 *   audioKind: 'masjid',
 * }) => void} [onPlayed]
 * @property {(error: unknown) => void} [onError]
 */

/**
 * Poll at a fixed interval and play Masjid audio 10 minutes before stored jamaat times.
 *
 * @param {JamaatReminderSchedulerOptions} options
 * @returns {{ stop: () => void, checkNow: () => Promise<{
 *   prayer: string,
 *   reminderTime: Date,
 *   jamaatTime: Date,
 *   minutesBefore: number,
 *   reminderId: string,
 *   audioKind: 'masjid',
 * } | null> }}
 */
export function startJamaatReminderScheduler({
  intervalMs = 60_000,
  audioBaseDir,
  dbPath,
  playAudio,
  onPlayed,
  onError,
}) {
  if (typeof playAudio !== 'function') {
    throw new Error('playAudio callback is required');
  }

  let lastPlayedKey = null;
  let timerId = null;

  const loadSchedules = () => {
    const jamaatTimes = listJamaatTimes({ dbPath, includeDisabled: false });
    return buildMasjidSchedules(jamaatTimes, audioBaseDir);
  };

  const checkNow = async () => {
    const now = new Date();
    const schedules = loadSchedules();
    const match = getMatchingJamaatReminder(now, schedules);

    if (!match) {
      return null;
    }

    const playKey = `${match.reminderId}-${truncateToMinute(now)}`;
    if (playKey === lastPlayedKey) {
      return null;
    }

    const reminderTime = getReminderTimeForToday(now, match);
    const jamaatTime = new Date(reminderTime);
    jamaatTime.setMinutes(jamaatTime.getMinutes() + match.minutesBefore);

    const resolvedPath = resolveAudioPath(match.audioFile, audioBaseDir);
    lastPlayedKey = playKey;

    try {
      await playAudio(resolvedPath, {
        prayer: match.prayer,
        reminderTime,
        jamaatTime,
        minutesBefore: match.minutesBefore,
        reminderId: match.reminderId,
        audioKind: 'masjid',
      });
    } catch (error) {
      lastPlayedKey = null;
      throw error;
    }

    const result = {
      prayer: match.prayer,
      reminderTime,
      jamaatTime,
      minutesBefore: match.minutesBefore,
      reminderId: match.reminderId,
      audioKind: /** @type {'masjid'} */ ('masjid'),
    };

    onPlayed?.(result);
    return result;
  };

  const runTick = createNonOverlappingTickRunner(checkNow, onError);

  timerId = setInterval(runTick, intervalMs);

  return {
    stop: () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    },
    checkNow,
  };
}
