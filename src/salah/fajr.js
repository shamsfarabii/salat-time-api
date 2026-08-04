import { ASTRONOMICAL_TWILIGHT_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

export function getFajrTime(date, latitude, longitude) {
  return getSunElevationCrossings(
    date,
    latitude,
    longitude,
    ASTRONOMICAL_TWILIGHT_ELEVATION
  ).dawn;
}
