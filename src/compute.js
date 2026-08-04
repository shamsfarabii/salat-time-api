import {
  getAsrTimes,
  getFajrTime,
  getIftarTime,
  getIshaTime,
  getMagribTime,
  getMakruhTimes,
  getNightTimes,
  getRedSkyEndTime,
  getSehriEndTime,
  getSunriseTime,
  getZuhrTime,
} from './salah/index.js';


export function computeSalahTimes(date, { latitude, longitude }) {
  const { asr, asrHanafi } = getAsrTimes(date, latitude, longitude);
  const { iftar } = getIftarTime(date, latitude, longitude);
  const { asrMakruhStart, ishaMakruhStart } = getMakruhTimes(date, latitude, longitude);

  return {
    fajr: getFajrTime(date, latitude, longitude),
    sehri: getSehriEndTime(date, latitude, longitude),
    sunrise: getSunriseTime(date, latitude, longitude),
    zuhr: getZuhrTime(date, latitude, longitude),
    asr,
    asrHanafi,
    magrib: getMagribTime(date, latitude, longitude),
    iftar,
    redSkyEnd: getRedSkyEndTime(date, latitude, longitude),
    isha: getIshaTime(date, latitude, longitude),
    asrMakruhStart,
    ishaMakruhStart,
    night: getNightTimes(date, latitude, longitude),
  };
}
