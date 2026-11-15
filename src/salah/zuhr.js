import { getSolarNoon } from '../astronomy/sun-events.js';
import { ZUHR_MINUTES_AFTER_ZAWAL } from '../constants.js';
import { addMinutes } from '../utils/date.js';

export function getZuhrDetails(date, latitude, longitude) {
  const { time: zawal, maxElevation } = getSolarNoon(date, latitude, longitude);

  return {
    zuhr: addMinutes(zawal, ZUHR_MINUTES_AFTER_ZAWAL),
    maximumElevation: maxElevation,
  };
}

export function getZuhrTime(date, latitude, longitude) {
  return getZuhrDetails(date, latitude, longitude).zuhr;
}
