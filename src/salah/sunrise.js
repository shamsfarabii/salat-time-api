import { HORIZON_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

export function getSunriseTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, HORIZON_ELEVATION)
    .dawn;
}
