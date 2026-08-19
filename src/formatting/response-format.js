import { addMinutes } from '../utils/date.js';
import { computeSalahTimes } from '../compute.js';
import { getQiblaDirection } from '../qibla.js';
import { formatTimeSlot, formatApiDate, getTimezoneOffsetSeconds } from './time-format.js';

const ISHRAQ_MINUTES_AFTER_SUNRISE = 15;
const SETSTART_MINUTES_BEFORE_MAGRIB = 5;

export function formatPrayerTimesForApi(times, timeZone) {
  const ishraq = times.sunrise
    ? addMinutes(times.sunrise, ISHRAQ_MINUTES_AFTER_SUNRISE)
    : null;
  const setstart = times.magrib
    ? addMinutes(times.magrib, -SETSTART_MINUTES_BEFORE_MAGRIB)
    : null;

  return {
    fajar18: formatTimeSlot(times.fajr, timeZone),
    rise: formatTimeSlot(times.sunrise, timeZone),
    noon: formatTimeSlot(times.zuhr, timeZone),
    asar1: formatTimeSlot(times.asr, timeZone),
    asar2: formatTimeSlot(times.asrHanafi, timeZone),
    set: formatTimeSlot(times.magrib, timeZone),
    magrib12: formatTimeSlot(times.redSkyEnd, timeZone),
    esha: formatTimeSlot(times.isha, timeZone),
    night1: formatTimeSlot(times.night.oneThird, timeZone),
    midnight: formatTimeSlot(times.night.half, timeZone),
    night2: formatTimeSlot(times.night.twoThird, timeZone),
    night6: formatTimeSlot(times.night.lastSixth, timeZone),
    sehri: formatTimeSlot(times.sehri, timeZone),
    setstart: formatTimeSlot(setstart, timeZone),
    ishraq: formatTimeSlot(ishraq, timeZone),
    asarend: formatTimeSlot(times.asrMakruhStart, timeZone),
  };
}

export function buildSalahTimesResponse(resolved) {
  const times = computeSalahTimes(resolved.date, {
    latitude: resolved.lat,
    longitude: resolved.lon,
  });

  return {
    lon: resolved.lonText,
    lat: resolved.latText,
    tzname: resolved.tzname,
    tz: getTimezoneOffsetSeconds(resolved.date, resolved.tzname),
    date: formatApiDate(resolved.date, resolved.tzname),
    is_gps: resolved.is_gps,
    qibla: getQiblaDirection(resolved.lat, resolved.lon),
    data: formatPrayerTimesForApi(times, resolved.tzname),
    name: resolved.name,
  };
}
