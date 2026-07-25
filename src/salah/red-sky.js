import { RED_SKY_ELEVATION } from '../constants.js';
import { getSunElevationCrossings } from '../astronomy/sun-events.js';

// RedSky end (লাল আলো শেষ): the sun's setting crossing of −12°. This is also
// taken as the end of Magrib.
export function getRedSkyEndTime(date, latitude, longitude) {
  return getSunElevationCrossings(date, latitude, longitude, RED_SKY_ELEVATION)
    .dusk;
}
