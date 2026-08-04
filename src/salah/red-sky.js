import { RED_SKY_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

export function getRedSkyEndTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, RED_SKY_ELEVATION)
    .dusk;
}
