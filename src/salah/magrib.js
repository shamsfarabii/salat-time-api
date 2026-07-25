import { getSunElevationCrossings } from '../astronomy/sun-events.js';
import { HORIZON_ELEVATION } from '../constants.js';

// Magrib begins at sunset: the sun's setting crossing of the apparent horizon.
export function getMagribTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, HORIZON_ELEVATION)
    .dusk;
}
