import { addMilliseconds, nextDay } from '../utils/date.js';
import { getFajrTime } from './fajr.js';
import { getMagribTime } from './magrib.js';

// The Islamic night runs from Magrib to the following Fajr. Optional time
// boundaries are defined as fractions of that period.

export function getNightPeriod(date, latitude, longitude) {
  const magrib = getMagribTime(date, latitude, longitude);
  const fajr = getFajrTime(nextDay(date), latitude, longitude);

  if (!magrib || !fajr) {
    return { magrib, fajr, durationMs: null };
  }

  return {
    magrib,
    fajr,
    durationMs: fajr.getTime() - magrib.getTime(),
  };
}

function fractionFromMagrib(date, latitude, longitude, fraction) {
  const { magrib, durationMs } = getNightPeriod(date, latitude, longitude);
  if (!magrib || !durationMs) {
    return null;
  }
  return addMilliseconds(magrib, durationMs * fraction);
}

export function getOneThirdOfNight(date, latitude, longitude) {
  return fractionFromMagrib(date, latitude, longitude, 1 / 3);
}

export function getTwoThirdOfNight(date, latitude, longitude) {
  return fractionFromMagrib(date, latitude, longitude, 2 / 3);
}

export function getHalfNight(date, latitude, longitude) {
  return fractionFromMagrib(date, latitude, longitude, 1 / 2);
}

export function getLastSixthOfNight(date, latitude, longitude) {
  const { fajr, durationMs } = getNightPeriod(date, latitude, longitude);
  if (!fajr || !durationMs) {
    return null;
  }
  return addMilliseconds(fajr, -durationMs / 6);
}

export function getNightTimes(date, latitude, longitude) {
  const { magrib, fajr, durationMs } = getNightPeriod(date, latitude, longitude);

  return {
    start: magrib,
    end: fajr,
    durationMs,
    oneThird: getOneThirdOfNight(date, latitude, longitude),
    twoThird: getTwoThirdOfNight(date, latitude, longitude),
    half: getHalfNight(date, latitude, longitude),
    lastSixth: getLastSixthOfNight(date, latitude, longitude),
  };
}
