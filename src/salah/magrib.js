import { getSunElevationCrossings } from '../astronomy/sun-events.js';
import { HORIZON_ELEVATION } from '../constants.js';

export function getMagribTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, HORIZON_ELEVATION)
    .dusk;
}
