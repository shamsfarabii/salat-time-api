import { nextDay } from './utils/date.js';
import { computeElevationTimes } from './salah/elevation-times.js';
import { computeAsrTimes } from './salah/asr.js';
import { computeNightTimes } from './salah/night.js';
import { computeIftarTime } from './salah/iftar.js';
import { computeMakruhTimes } from './salah/makruh.js';

/**
 * Computes all Islamic prayer times for a given date and geographic location.
 *
 * @param {Date} date — the calendar date (day boundaries use the server's local timezone)
 * @param {{ latitude: number, longitude: number }} coordinates — degrees
 * @returns {{
 *   fajr: Date | null,
 *   sehri: Date | null,
 *   sunrise: Date | null,
 *   zuhr: Date,
 *   asr: Date | null,
 *   asrHanafi: Date | null,
 *   magrib: Date | null,
 *   iftar: Date | null,
 *   redSkyEnd: Date | null,
 *   isha: Date | null,
 *   asrMakruhStart: Date | null,
 *   ishaMakruhStart: Date | null,
 *   night: { start, end, durationMs, oneThird, half, twoThird, lastSixth },
 * }}
 */
export function computeSalahTimes(date, { latitude, longitude }) {
  const base = computeElevationTimes(date, latitude, longitude);

  const { asr, asrHanafi } = computeAsrTimes(
    date, latitude, longitude,
    base.solarNoonTime, base.maxElevationDeg,
  );

  const nextDayFajr = computeElevationTimes(nextDay(date), latitude, longitude).fajr;
  const night = computeNightTimes(base.sunset, nextDayFajr);

  const { iftar } = computeIftarTime(base.sunset);
  const { asrMakruhStart, ishaMakruhStart } = computeMakruhTimes(base.sunset, night.half);

  return {
    fajr: base.fajr,
    sehri: base.fajr,
    sunrise: base.sunrise,
    zuhr: base.solarNoonTime,
    asr,
    asrHanafi,
    magrib: base.sunset,
    iftar,
    redSkyEnd: base.redSkyEnd,
    isha: base.isha,
    asrMakruhStart,
    ishaMakruhStart,
    night,
  };
}
