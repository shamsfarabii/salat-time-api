import { isSameMinute } from '../utils/time-match.js';
import {
  MASJID_MINUTES_BEFORE_JAMAAT,
  getMasjidAudioFileName,
  masjidAudioExists,
} from './prayer-audio-files.js';

/**
 * Build a Date for today at the given clock time.
 *
 * @param {Date} now
 * @param {number} hours
 * @param {number} minutes
 * @returns {Date}
 */
export function buildDailyTime(now, hours, minutes) {
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  return target;
}

/**
 * Subtract minutes from a daily clock time, wrapping to the previous day when needed.
 *
 * @param {number} hours
 * @param {number} minutes
 * @param {number} minutesBefore
 * @returns {{ hours: number, minutes: number }}
 */
export function subtractMinutesFromClockTime(hours, minutes, minutesBefore) {
  const totalMinutes = hours * 60 + minutes - minutesBefore;
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);

  return {
    hours: Math.floor(normalized / 60),
    minutes: normalized % 60,
  };
}

/**
 * @typedef {Object} JamaatReminderSchedule
 * @property {string} reminderId
 * @property {number} jamaatTimeId
 * @property {string} prayer
 * @property {number} jamaatHours
 * @property {number} jamaatMinutes
 * @property {number} minutesBefore
 * @property {string} audioFile
 */

/**
 * Build Masjid reminder schedules from saved jamaat times and assets/audio files.
 *
 * @param {Array<{ id: number, prayer: string, hours: number, minutes: number }>} jamaatTimes
 * @param {string | undefined} audioBaseDir
 * @returns {JamaatReminderSchedule[]}
 */
export function buildMasjidSchedules(jamaatTimes, audioBaseDir) {
  return jamaatTimes.flatMap((jamaatTime) => {
    if (!masjidAudioExists(jamaatTime.prayer, audioBaseDir)) {
      return [];
    }

    return [{
      reminderId: `${jamaatTime.prayer}-masjid`,
      jamaatTimeId: jamaatTime.id,
      prayer: jamaatTime.prayer,
      jamaatHours: jamaatTime.hours,
      jamaatMinutes: jamaatTime.minutes,
      minutesBefore: MASJID_MINUTES_BEFORE_JAMAAT,
      audioFile: getMasjidAudioFileName(jamaatTime.prayer),
    }];
  });
}

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule} schedule
 * @returns {Date}
 */
export function getReminderTimeForToday(now, schedule) {
  const reminderClock = subtractMinutesFromClockTime(
    schedule.jamaatHours,
    schedule.jamaatMinutes,
    schedule.minutesBefore
  );

  return buildDailyTime(now, reminderClock.hours, reminderClock.minutes);
}

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule[]} schedules
 * @returns {JamaatReminderSchedule | null}
 */
export function getMatchingJamaatReminder(now, schedules) {
  for (const schedule of schedules) {
    const reminderTime = getReminderTimeForToday(now, schedule);
    if (isSameMinute(now, reminderTime)) {
      return schedule;
    }
  }

  return null;
}

/**
 * @param {import('../db/repositories/jamaat-reminders.js').JamaatReminderWithJamaat} row
 * @returns {JamaatReminderSchedule}
 */
export function mapReminderRowToSchedule(row) {
  return {
    reminderId: row.id,
    jamaatTimeId: row.jamaat_time_id,
    prayer: row.prayer,
    jamaatHours: row.jamaat_hours,
    jamaatMinutes: row.jamaat_minutes,
    minutesBefore: row.minutes_before,
    audioFile: row.audio_file,
  };
}
