import { ISHRAQ_MINUTES_AFTER_SUNRISE } from '../constants.js';
import { getTwoThirdOfNight } from '../salah/night.js';
import { addMinutes, previousDay, startOfDay } from '../utils/date.js';

/**
 * Calendar date whose maghrib→fajr night is active at `now`.
 * Between midnight and fajr, the in-progress night started the previous day.
 *
 * @param {Date} now
 * @param {Date | null | undefined} fajrTime Today's fajr for the calendar day of `now`
 * @returns {Date}
 */
export function getActiveNightDate(now, fajrTime) {
  const today = startOfDay(now);

  if (
    fajrTime instanceof Date &&
    !Number.isNaN(fajrTime.getTime()) &&
    now < fajrTime
  ) {
    return previousDay(today);
  }

  return today;
}

/**
 * @typedef {Object} ResolveSpecialSalahTimesOptions
 * @property {Date} [now] Defaults to the current time
 * @property {number} [latitude] Required to correct tahajjud between midnight and fajr
 * @property {number} [longitude] Required to correct tahajjud between midnight and fajr
 */

/**
 * Derive special-time playback moments from computed salah times.
 *
 * @param {Record<string, unknown>} salahTimes
 * @param {ResolveSpecialSalahTimesOptions} [options]
 * @returns {{ sunrise: Date | null, tahajjud: Date | null, ishraq: Date | null }}
 */
export function resolveSpecialSalahTimes(salahTimes, options = {}) {
  const { now = new Date(), latitude, longitude } = options;

  const sunrise =
    salahTimes.sunrise instanceof Date && !Number.isNaN(salahTimes.sunrise.getTime())
      ? salahTimes.sunrise
      : null;

  const fajr =
    salahTimes.fajr instanceof Date && !Number.isNaN(salahTimes.fajr.getTime())
      ? salahTimes.fajr
      : null;

  let tahajjud = null;
  if (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const activeNightDate = getActiveNightDate(now, fajr);
    tahajjud = getTwoThirdOfNight(activeNightDate, latitude, longitude);
  } else {
    const night = salahTimes.night;
    tahajjud =
      night &&
      typeof night === 'object' &&
      night.twoThird instanceof Date &&
      !Number.isNaN(night.twoThird.getTime())
        ? night.twoThird
        : null;
  }

  const ishraq = sunrise ? addMinutes(sunrise, ISHRAQ_MINUTES_AFTER_SUNRISE) : null;

  return { sunrise, tahajjud, ishraq };
}
