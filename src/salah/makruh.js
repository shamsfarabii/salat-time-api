import { addMinutes } from '../utils/date.js';
import { getMagribTime } from './magrib.js';
import { getHalfNight } from './night.js';

export const ASR_MAKRUH_MINUTES_BEFORE_MAGRIB = 30;

export function getAsrMakruhTime(date, latitude, longitude) {
  const magrib = getMagribTime(date, latitude, longitude);
  return magrib ? addMinutes(magrib, -ASR_MAKRUH_MINUTES_BEFORE_MAGRIB) : null;
}

export function getIshaMakruhTime(date, latitude, longitude) {
  return getHalfNight(date, latitude, longitude);
}

export function getMakruhTimes(date, latitude, longitude) {
  return {
    asrMakruhStart: getAsrMakruhTime(date, latitude, longitude),
    ishaMakruhStart: getIshaMakruhTime(date, latitude, longitude),
  };
}
