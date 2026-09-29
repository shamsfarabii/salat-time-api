import { getMagribTime } from '../salah/magrib.js';
import { addMinutes } from '../utils/date.js';
import { isSameMinute } from '../utils/time-match.js';
import {
  MAGRIB_MASJID_MINUTES_BEFORE_WAQT,
  MASJID_MINUTES_BEFORE_JAMAAT,
  getMasjidAudioFileName,
  masjidAudioExists,
} from './prayer-audio-files.js';

/**
 * @typedef {{ latitude: number, longitude: number }} JamaatLocation
 */

/**
 * @param {JamaatLocation | undefined} location
 * @returns {boolean}
 */
function hasValidLocation(location) {
  return (
    location !== undefined &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude)
  );
}

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
 * Calculated maghrib waqt (sunset) for the calendar day of `now`.
 *
 * @param {Date} now
 * @param {JamaatLocation} [location]
 * @returns {Date | null}
 */
export function resolveMagribWaqtForToday(now, location) {
  if (!hasValidLocation(location)) {
    return null;
  }

  const magribWaqt = getMagribTime(now, location.latitude, location.longitude);
  if (!(magribWaqt instanceof Date) || Number.isNaN(magribWaqt.getTime())) {
    return null;
  }

  return magribWaqt;
}

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule} schedule
 * @param {JamaatLocation} [_location]
 * @returns {Date}
 */
export function resolveJamaatTimeForToday(now, schedule, _location) {
  return buildDailyTime(now, schedule.jamaatHours, schedule.jamaatMinutes);
}

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule} schedule
 * @param {JamaatLocation} [location]
 * @returns {Date}
 */
export function getReminderTimeForToday(now, schedule, location) {
  if (schedule.prayer === 'magrib') {
    const magribWaqt = resolveMagribWaqtForToday(now, location);
    if (magribWaqt) {
      return addMinutes(magribWaqt, -MAGRIB_MASJID_MINUTES_BEFORE_WAQT);
    }
  }

  const jamaatTime = resolveJamaatTimeForToday(now, schedule, location);
  return addMinutes(jamaatTime, -schedule.minutesBefore);
}

/**
 * Minutes before the reference prayer time (waqt for magrib, jamaat for others).
 *
 * @param {JamaatReminderSchedule} schedule
 * @returns {number}
 */
export function getMasjidMinutesBeforeReference(schedule) {
  return schedule.prayer === 'magrib'
    ? MAGRIB_MASJID_MINUTES_BEFORE_WAQT
    : schedule.minutesBefore;
}

/**
 * Reference instant used for logging and callbacks (waqt for magrib, jamaat for others).
 *
 * @param {Date} now
 * @param {JamaatReminderSchedule} schedule
 * @param {JamaatLocation} [location]
 * @returns {Date}
 */
export function resolveMasjidReferenceTimeForToday(now, schedule, location) {
  if (schedule.prayer === 'magrib') {
    const magribWaqt = resolveMagribWaqtForToday(now, location);
    if (magribWaqt) {
      return magribWaqt;
    }
  }

  return resolveJamaatTimeForToday(now, schedule, location);
}

/**
 * @param {Date} now
 * @param {JamaatReminderSchedule[]} schedules
 * @param {JamaatLocation} [location]
 * @returns {JamaatReminderSchedule | null}
 */
export function getMatchingJamaatReminder(now, schedules, location) {
  for (const schedule of schedules) {
    const reminderTime = getReminderTimeForToday(now, schedule, location);
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
