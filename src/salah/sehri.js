import { getFajrTime } from './fajr.js';

export function getSehriEndTime(date, latitude, longitude) {
  return getFajrTime(date, latitude, longitude);
}
