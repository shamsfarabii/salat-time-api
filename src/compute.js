import {
  getAsrTimes,
  getFajrTime,
  getIftarTime,
  getIshaTime,
  getMagribTime,
  getMakruhTimes,
  getNightTimes,
  getRedSkyEndTime,
  getSehriEndTime,
  getSunriseTime,
  getZuhrTime,
} from './salah/index.js';

/**
 * @typedef {{ latitude: number; longitude: number }} Location
 */

/**
 * @typedef {Object} SalahTimes
 * @property {Date | null} fajr
 * @property {Date | null} sehri
 * @property {Date | null} sunrise
 * @property {Date | null} zuhr
 * @property {Date | null} asr
 * @property {Date | null} asrHanafi
 * @property {Date | null} magrib
 * @property {Date | null} iftar
 * @property {Date | null} redSkyEnd
 * @property {Date | null} isha
 * @property {Date | null} asrMakruhStart
 * @property {Date | null} ishaMakruhStart
 * @property {{ start: Date | null; end: Date | null; durationMs: number | null; oneThird: Date | null; half: Date | null; lastSixth: Date | null }} night
 */

/**
 * Compute all salah times for a given date and observer location.
 * Each time is sourced from its own module — this function only composes them.
 *
 * @param {Date} date
 * @param {Location} location
 * @returns {SalahTimes}
 */
export function computeSalahTimes(date, { latitude, longitude }) {
  const { asr, asrHanafi } = getAsrTimes(date, latitude, longitude);
  const { iftar } = getIftarTime(date, latitude, longitude);
  const { asrMakruhStart, ishaMakruhStart } = getMakruhTimes(date, latitude, longitude);

  return {
    fajr: getFajrTime(date, latitude, longitude),
    sehri: getSehriEndTime(date, latitude, longitude),
    sunrise: getSunriseTime(date, latitude, longitude),
    zuhr: getZuhrTime(date, latitude, longitude),
    asr,
    asrHanafi,
    magrib: getMagribTime(date, latitude, longitude),
    iftar,
    redSkyEnd: getRedSkyEndTime(date, latitude, longitude),
    isha: getIshaTime(date, latitude, longitude),
    asrMakruhStart,
    ishaMakruhStart,
    night: getNightTimes(date, latitude, longitude),
  };
}
