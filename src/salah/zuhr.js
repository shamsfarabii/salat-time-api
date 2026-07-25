import { getSolarNoon } from '../astronomy/sun-events.js';

// Zuhr is prayed after solar noon (zawal). This module owns that instant and
// the day's maximum solar elevation, which Asr derives from.
export function getZuhrDetails(date, latitude, longitude) {
  const { time, maxElevation } = getSolarNoon(date, latitude, longitude);

  return {
    zuhr: time,
    maximumElevation: maxElevation,
  };
}

export function getZuhrTime(date, latitude, longitude) {
  return getZuhrDetails(date, latitude, longitude).zuhr;
}
