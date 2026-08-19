import {
  ASTRONOMICAL_TWILIGHT_ELEVATION,
  HORIZON_ELEVATION,
  RED_SKY_ELEVATION,
} from '../constants.js';
import { getSolarNoon, getSunElevationCrossings } from '../astronomy/sun-events.js';

/**
 * Computes all base elevation-crossing times and solar noon for a given date
 * and location in a single pass. Each elevation is resolved once rather than
 * being re-derived by individual prayer modules.
 *
 * @param {Date} date
 * @param {number} latitude  — degrees
 * @param {number} longitude — degrees
 * @returns {{
 *   fajr: Date | null,
 *   sunrise: Date | null,
 *   solarNoonTime: Date,
 *   maxElevationDeg: number,
 *   sunset: Date | null,
 *   redSkyEnd: Date | null,
 *   isha: Date | null,
 * }}
 */
export function computeElevationTimes(date, latitude, longitude) {
  const horizon = getSunElevationCrossings(date, latitude, longitude, HORIZON_ELEVATION);
  const astronomical = getSunElevationCrossings(date, latitude, longitude, ASTRONOMICAL_TWILIGHT_ELEVATION);
  const redSky = getSunElevationCrossings(date, latitude, longitude, RED_SKY_ELEVATION);
  const solarNoon = getSolarNoon(date, latitude, longitude);

  return {
    fajr: astronomical.dawn,
    sunrise: horizon.dawn,
    solarNoonTime: solarNoon.time,
    maxElevationDeg: solarNoon.maxElevation,
    sunset: horizon.dusk,
    redSkyEnd: redSky.dusk,
    isha: astronomical.dusk,
  };
}
