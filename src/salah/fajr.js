import { ASTRONOMICAL_TWILIGHT_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

// Fajr begins at subhe sadiq (true dawn): the start of astronomical twilight,
// when the sun first rises past 18° below the horizon.
export function getFajrTime(date, latitude, longitude) {
  return getSunElevationCrossings(
    date,
    latitude,
    longitude,
    ASTRONOMICAL_TWILIGHT_ELEVATION
  ).dawn;
}
