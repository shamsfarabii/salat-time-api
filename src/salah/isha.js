import { ASTRONOMICAL_TWILIGHT_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

// Isha begins at the end of evening twilight, when the sun sets past 18° below
// the horizon (the dusk counterpart of Fajr).
export function getIshaTime(date, latitude, longitude) {
  return getSunElevationCrossings(
    date,
    latitude,
    longitude,
    ASTRONOMICAL_TWILIGHT_ELEVATION
  ).dusk;
}
