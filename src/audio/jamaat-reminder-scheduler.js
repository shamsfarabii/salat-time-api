import { truncateToMinute } from '../utils/time-match.js';
import { listJamaatTimes } from '../db/repositories/jamaat-times.js';
import { resolveAudioPath } from './resolve-audio-path.js';
import {
  buildMasjidSchedules,
  getMasjidMinutesBeforeReference,
  getReminderTimeForToday,
  resolveMasjidReferenceTimeForToday,
} from './jamaat-time-utils.js';
import { createNonOverlappingTickRunner } from './tick-runner.js';
import {
  createDeferredTimer,
  delayUntil,
  startOfNextLocalDay,
} from './event-timer.js';

/**
 * @typedef {Object} JamaatReminderSchedulerOptions
 * @property {number} [latitude] Required for Maghrib Masjid (5 min before waqt)
 * @property {number} [longitude] Required for Maghrib Masjid (5 min before waqt)
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
 * @typedef {import('./jamaat-time-utils.js').JamaatReminderSchedule} JamaatReminderSchedule
 */

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule[]} schedules
 * @param {{ latitude: number, longitude: number } | undefined} location
 * @returns {Array<{ schedule: JamaatReminderSchedule, reminderTime: Date }>}
 */
function getOrderedRemindersForDay(now, schedules, location) {
  return schedules
    .map((schedule) => {
      const reminderTime = getReminderTimeForToday(now, schedule, location);
      if (!(reminderTime instanceof Date) || Number.isNaN(reminderTime.getTime())) {
        return null;
      }

      return { schedule, reminderTime };
    })
    .filter((entry) => entry !== null)
    .sort((a, b) => a.reminderTime.getTime() - b.reminderTime.getTime());
}

/**
 * Play Masjid audio before jamaat (Maghrib: 5 min before waqt).
 * Uses a single timer until the next reminder instead of polling the clock.
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
  latitude,
  longitude,
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
  const timer = createDeferredTimer();

  const location =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : undefined;

  const loadSchedules = () => {
    const jamaatTimes = listJamaatTimes({ dbPath, includeDisabled: false });
    return buildMasjidSchedules(jamaatTimes, audioBaseDir);
  };

  const checkNow = async () => {
    const now = new Date();
    const schedules = loadSchedules();
    const nowMinute = truncateToMinute(now);

    for (const { schedule, reminderTime } of getOrderedRemindersForDay(now, schedules, location)) {
      if (truncateToMinute(reminderTime) !== nowMinute) {
        continue;
      }

      const playKey = `${schedule.reminderId}-${nowMinute}`;
      if (playKey === lastPlayedKey) {
        continue;
      }

      const jamaatTime = resolveMasjidReferenceTimeForToday(now, schedule, location);
      const minutesBefore = getMasjidMinutesBeforeReference(schedule);
      const resolvedPath = resolveAudioPath(schedule.audioFile, audioBaseDir);
      lastPlayedKey = playKey;

      try {
        await playAudio(resolvedPath, {
          prayer: schedule.prayer,
          reminderTime,
          jamaatTime,
          minutesBefore,
          reminderId: schedule.reminderId,
          audioKind: 'masjid',
        });
      } catch (error) {
        lastPlayedKey = null;
        throw error;
      }

      const result = {
        prayer: schedule.prayer,
        reminderTime,
        jamaatTime,
        minutesBefore,
        reminderId: schedule.reminderId,
        audioKind: /** @type {'masjid'} */ ('masjid'),
      };

      onPlayed?.(result);
      return result;
    }

    return null;
  };

  const armNextWake = () => {
    if (timer.stopped) {
      return;
    }

    const now = new Date();
    const nowMinute = truncateToMinute(now);
    const schedules = loadSchedules();
    const dayReminders = getOrderedRemindersForDay(now, schedules, location);

    for (const { schedule, reminderTime } of dayReminders) {
      const reminderMinute = truncateToMinute(reminderTime);
      if (reminderMinute < nowMinute) {
        continue;
      }

      const playKey = `${schedule.reminderId}-${reminderMinute}`;
      if (reminderMinute === nowMinute && playKey === lastPlayedKey) {
        continue;
      }

      const wakeAt = new Date(reminderMinute);
      timer.schedule(delayUntil(wakeAt, now), runWake);
      return;
    }

    const nextDay = startOfNextLocalDay(now);
    timer.schedule(delayUntil(nextDay, now) + 1_000, runWake);
  };

  const runWake = createNonOverlappingTickRunner(async () => {
    await checkNow();
    armNextWake();
  }, onError);

  armNextWake();

  return {
    stop: () => {
      timer.stop();
    },
    checkNow,
  };
}