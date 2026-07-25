import { getFajrTime } from './fajr.js';

// Sehri ends at Fajr — the last moment to stop eating before the fast begins.
export function getSehriEndTime(date, latitude, longitude) {
  return getFajrTime(date, latitude, longitude);
}
