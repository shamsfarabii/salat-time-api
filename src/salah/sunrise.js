import { HORIZON_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

// Sunrise: the sun's rising crossing of the apparent horizon.
export function getSunriseTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, HORIZON_ELEVATION)
    .dawn;
}
