import { DAY_MS, DEG_TO_RAD, RAD_TO_DEG } from '../constants.js';

const UNIX_EPOCH_AS_JULIAN_DAY = 2440587.5;
const J2000_EPOCH_JULIAN_DAY = 2451545.0;

function toJulianDay(date) {
  return date.getTime() / DAY_MS + UNIX_EPOCH_AS_JULIAN_DAY;
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Computes the sun's elevation angle above the horizon at a given instant
 * and geographic location. Uses a low-precision solar position algorithm
 * based on the J2000 epoch.
 *
 * @param {Date} date
 * @param {number} latitude  — degrees, north positive
 * @param {number} longitude — degrees, east positive
 * @returns {number} elevation in degrees (negative = below horizon)
 */
export function getSolarElevation(date, latitude, longitude) {
  const julianDay = toJulianDay(date);
  const daysSinceJ2000 = julianDay - J2000_EPOCH_JULIAN_DAY;

  const meanLongitude = normalizeDegrees(280.46646 + 0.98564736 * daysSinceJ2000);
  const meanAnomaly = normalizeDegrees(357.52911 + 0.98560028 * daysSinceJ2000);

  const equationOfCenter =
    1.914602 * Math.sin(meanAnomaly * DEG_TO_RAD) +
    0.019993 * Math.sin(2 * meanAnomaly * DEG_TO_RAD) +
    0.000289 * Math.sin(3 * meanAnomaly * DEG_TO_RAD);

  const eclipticLongitude = normalizeDegrees(meanLongitude + equationOfCenter);
  const obliquity = 23.439291 - 0.00000036 * daysSinceJ2000;

  const declination =
    Math.asin(
      Math.sin(obliquity * DEG_TO_RAD) * Math.sin(eclipticLongitude * DEG_TO_RAD)
    ) * RAD_TO_DEG;

  const rightAscension =
    Math.atan2(
      Math.cos(obliquity * DEG_TO_RAD) * Math.sin(eclipticLongitude * DEG_TO_RAD),
      Math.cos(eclipticLongitude * DEG_TO_RAD)
    ) * RAD_TO_DEG;

  const siderealTime = normalizeDegrees(
    280.46061837 + 360.98564736629 * daysSinceJ2000
  );

  const hourAngle = normalizeDegrees(siderealTime + longitude - rightAscension);
  const signedHourAngle = hourAngle > 180 ? hourAngle - 360 : hourAngle;

  return (
    Math.asin(
      Math.sin(latitude * DEG_TO_RAD) * Math.sin(declination * DEG_TO_RAD) +
        Math.cos(latitude * DEG_TO_RAD) *
          Math.cos(declination * DEG_TO_RAD) *
          Math.cos(signedHourAngle * DEG_TO_RAD)
    ) * RAD_TO_DEG
  );
}
