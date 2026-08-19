import { DEG_TO_RAD, RAD_TO_DEG } from './constants.js';

const KAABA_LATITUDE = 21.422487;
const KAABA_LONGITUDE = 39.826206;

/**
 * Computes the Qibla bearing (compass direction toward the Kaaba in Mecca)
 * from a given geographic location.
 *
 * @param {number} latitude  — degrees, north positive
 * @param {number} longitude — degrees, east positive
 * @returns {number} bearing in degrees (0 = north, 90 = east, clockwise)
 */
export function getQiblaDirection(latitude, longitude) {
  const latitudeRad = latitude * DEG_TO_RAD;
  const kaabaLatitudeRad = KAABA_LATITUDE * DEG_TO_RAD;
  const longitudeDeltaRad = (KAABA_LONGITUDE - longitude) * DEG_TO_RAD;

  const y = Math.sin(longitudeDeltaRad);
  const x =
    Math.cos(latitudeRad) * Math.tan(kaabaLatitudeRad) -
    Math.sin(latitudeRad) * Math.cos(longitudeDeltaRad);

  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}
