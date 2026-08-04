import { getSolarNoon } from '../astronomy/sun-events.js';

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
