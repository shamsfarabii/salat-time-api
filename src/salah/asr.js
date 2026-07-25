import { DEG_TO_RAD, RAD_TO_DEG } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';
import { getZuhrDetails } from './zuhr.js';

// Asr begins when an object's shadow grows to its noon length plus a multiple
// of the object's height. The multiple (shadow factor) is what distinguishes
// the two main juristic opinions.
export const SHADOW_FACTOR_STANDARD = 1; // Shafi'i, Maliki, Hanbali
export const SHADOW_FACTOR_HANAFI = 2;

function getAsrElevation(maximumElevation, shadowFactor) {
  const noonShadow = 1 / Math.tan(maximumElevation * DEG_TO_RAD);
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

export function getAsrTime(date, latitude, longitude) {
  return getAsrTimes(date, latitude, longitude).asr;
}

export function getAsrTimes(date, latitude, longitude) {
  const { zuhr, maximumElevation } = getZuhrDetails(date, latitude, longitude);

  const standardElevation = getAsrElevation(maximumElevation, SHADOW_FACTOR_STANDARD);
  const hanafiElevation = getAsrElevation(maximumElevation, SHADOW_FACTOR_HANAFI);

  return {
    asr: findAsrTime(date, latitude, longitude, standardElevation, zuhr),
    asrHanafi: findAsrTime(date, latitude, longitude, hanafiElevation, zuhr),
  };
}
