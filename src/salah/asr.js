import { DEG_TO_RAD, RAD_TO_DEG } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

export const SHADOW_FACTOR_STANDARD = 1; // Shafi'i, Maliki, Hanbali
export const SHADOW_FACTOR_HANAFI = 2;

function getAsrElevation(maximumElevationDeg, shadowFactor) {
  const noonShadow = 1 / Math.tan(maximumElevationDeg * DEG_TO_RAD);
  return Math.atan(1 / (shadowFactor + noonShadow)) * RAD_TO_DEG;
}

function findAsrTime(date, latitude, longitude, asrElevation, zuhrTime) {
  const { dusk, crossings } = getSunElevationCrossings(
    date,
    latitude,
    longitude,
    asrElevation
  );

  if (dusk && dusk > zuhrTime) {
    return dusk;
  }

  const afternoonCrossing = crossings.find(
    (crossing) => crossing.direction === 'downward' && crossing.time > zuhrTime
  );

  return afternoonCrossing ? afternoonCrossing.time : null;
}

/**
 * @param {Date} date
 * @param {number} latitude  — degrees
 * @param {number} longitude — degrees
 * @param {Date} solarNoonTime — pre-computed from computeElevationTimes
 * @param {number} maxElevationDeg — pre-computed from computeElevationTimes
 * @returns {{ asr: Date | null, asrHanafi: Date | null }}
 */
export function computeAsrTimes(date, latitude, longitude, solarNoonTime, maxElevationDeg) {
  const standardElevation = getAsrElevation(maxElevationDeg, SHADOW_FACTOR_STANDARD);
  const hanafiElevation = getAsrElevation(maxElevationDeg, SHADOW_FACTOR_HANAFI);

  return {
    asr: findAsrTime(date, latitude, longitude, standardElevation, solarNoonTime),
    asrHanafi: findAsrTime(date, latitude, longitude, hanafiElevation, solarNoonTime),
  };
}
