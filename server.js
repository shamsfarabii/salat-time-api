import express from 'express';
import { computeSalahTimes } from './src/index.js';
import { mountJamaatRoutes } from './src/db/routes.js';
import { DEG_TO_RAD, RAD_TO_DEG } from './src/constants.js';
import { addMinutes } from './src/utils/date.js';
import { ISHRAQ_MINUTES_AFTER_SUNRISE } from './src/constants.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    response.sendStatus(204);
    return;
  }

  next();
});

const KAABA_LATITUDE = 21.422487;
const KAABA_LONGITUDE = 39.826206;
const SETSTART_MINUTES_BEFORE_MAGRIB = 5;
const DEFAULT_TZNAME = 'Asia/Dhaka';

const MONTH_INDEX_BY_NAME = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

app.use(express.json());


function getQiblaDirection(latitude, longitude) {
  const latitudeRad = latitude * DEG_TO_RAD;
  const kaabaLatitudeRad = KAABA_LATITUDE * DEG_TO_RAD;
  const longitudeDeltaRad = (KAABA_LONGITUDE - longitude) * DEG_TO_RAD;

  const y = Math.sin(longitudeDeltaRad);
  const x =
    Math.cos(latitudeRad) * Math.tan(kaabaLatitudeRad) -
    Math.sin(latitudeRad) * Math.cos(longitudeDeltaRad);

  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

function getTimezoneOffsetSeconds(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    timeZoneName: 'longOffset',
  }).formatToParts(date);

  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value;
  if (!offsetPart || offsetPart === 'GMT') {
    return 0;
  }

  const match = offsetPart.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? 0);
  return sign * (hours * 3600 + minutes * 60);
}

function formatApiDate(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).formatToParts(date);

  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  return `${day}-${month}-${year}`;
}

function formatTimeEntry(time, timeZone) {
  if (!(time instanceof Date) || Number.isNaN(time.getTime())) {
    return null;
  }

  const long = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
    .format(time)
    .toLowerCase()
    .replace(/\u202f/g, ' ');

  const rounded = new Date(Math.round(time.getTime() / 60_000) * 60_000);
  const shortParts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(rounded);

  const hour = shortParts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = shortParts.find((part) => part.type === 'minute')?.value ?? '';

  return {
    short: `${hour}:${minute}`,
    long,
    secs: time.getTime() / 1000,
  };
}

function formatData(times, timeZone) {
  const ishraq = times.sunrise
    ? addMinutes(times.sunrise, ISHRAQ_MINUTES_AFTER_SUNRISE)
    : null;
  const setstart = times.magrib
    ? addMinutes(times.magrib, -SETSTART_MINUTES_BEFORE_MAGRIB)
    : null;

  return {
    fajar18: formatTimeEntry(times.fajr, timeZone),
    rise: formatTimeEntry(times.sunrise, timeZone),
    noon: formatTimeEntry(times.zuhr, timeZone),
    asar1: formatTimeEntry(times.asr, timeZone),
    asar2: formatTimeEntry(times.asrHanafi, timeZone),
    set: formatTimeEntry(times.magrib, timeZone),
    magrib12: formatTimeEntry(times.redSkyEnd, timeZone),
    esha: formatTimeEntry(times.isha, timeZone),
    night1: formatTimeEntry(times.night.oneThird, timeZone),
    midnight: formatTimeEntry(times.night.half, timeZone),
    night2: formatTimeEntry(times.night.twoThird, timeZone),
    night6: formatTimeEntry(times.night.lastSixth, timeZone),
    sehri: formatTimeEntry(times.sehri, timeZone),
    setstart: formatTimeEntry(setstart, timeZone),
    ishraq: formatTimeEntry(ishraq, timeZone),
    asarend: formatTimeEntry(times.asrMakruhStart, timeZone),
  };
}

function parseCoordinate(value, name) {
  if (value === undefined || value === null || value === '') {
    return { ok: false, error: `${name} is required` };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { ok: false, error: `${name} must be a valid number` };
  }

  return { ok: true, value: parsed };
}

function parseDate(value) {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: new Date() };
  }

  const raw = String(value).trim();
  const apiDateMatch = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (apiDateMatch) {
    const day = Number(apiDateMatch[1]);
    const monthName = apiDateMatch[2][0].toUpperCase() + apiDateMatch[2].slice(1).toLowerCase();
    const year = Number(apiDateMatch[3]);
    const monthIndex = MONTH_INDEX_BY_NAME[monthName];

    if (monthIndex === undefined) {
      return { ok: false, error: 'date must use a valid month abbreviation (e.g. 24-Aug-2022)' };
    }

    const parsed = new Date(year, monthIndex, day);
    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== monthIndex ||
      parsed.getDate() !== day
    ) {
      return { ok: false, error: 'date must be a valid calendar date (e.g. 24-Aug-2022)' };
    }

    return { ok: true, value: parsed };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: 'date must be a valid ISO 8601 or DD-Mon-YYYY date' };
  }

  return { ok: true, value: parsed };
}

function parseTimeZone(value) {
  const timeZone = value === undefined || value === null || value === ''
    ? DEFAULT_TZNAME
    : String(value);

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return { ok: true, value: timeZone };
  } catch {
    return { ok: false, error: 'tzname must be a valid IANA timezone (e.g. Asia/Dhaka)' };
  }
}

function resolveRequest(input) {
  const latitudeResult = parseCoordinate(input.lat ?? input.latitude, 'lat');
  if (!latitudeResult.ok) {
    return { ok: false, error: latitudeResult.error };
  }

  const longitudeResult = parseCoordinate(input.lon ?? input.longitude ?? input.lng, 'lon');
  if (!longitudeResult.ok) {
    return { ok: false, error: longitudeResult.error };
  }

  if (latitudeResult.value < -90 || latitudeResult.value > 90) {
    return { ok: false, error: 'lat must be between -90 and 90' };
  }

  if (longitudeResult.value < -180 || longitudeResult.value > 180) {
    return { ok: false, error: 'lon must be between -180 and 180' };
  }

  const dateResult = parseDate(input.date);
  if (!dateResult.ok) {
    return { ok: false, error: dateResult.error };
  }

  const timeZoneResult = parseTimeZone(input.tzname);
  if (!timeZoneResult.ok) {
    return { ok: false, error: timeZoneResult.error };
  }

  const isGpsRaw = input.is_gps;
  const isGps =
    isGpsRaw === undefined || isGpsRaw === null || isGpsRaw === ''
      ? 1
      : Number(isGpsRaw);

  if (!Number.isFinite(isGps)) {
    return { ok: false, error: 'is_gps must be a number' };
  }

  const name =
    input.name === undefined || input.name === null || input.name === ''
      ? 'GPS Location'
      : String(input.name);

  return {
    ok: true,
    value: {
      lat: latitudeResult.value,
      lon: longitudeResult.value,
      latText: String(input.lat ?? input.latitude),
      lonText: String(input.lon ?? input.longitude ?? input.lng),
      date: dateResult.value,
      tzname: timeZoneResult.value,
      is_gps: isGps,
      name,
    },
  };
}

function buildResponse(resolved) {
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
    data: formatData(times, resolved.tzname),
    name: resolved.name,
  };
}

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/salah-times', (request, response) => {
  const resolved = resolveRequest(request.query);
  if (!resolved.ok) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  response.json(buildResponse(resolved.value));
});

app.post('/salah-times', (request, response) => {
  const resolved = resolveRequest(request.body ?? {});
  if (!resolved.ok) {
    response.status(400).json({ error: resolved.error });
    return;
  }

  response.json(buildResponse(resolved.value));
});

mountJamaatRoutes(app);

app.use((_request, response) => {
  response.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Salah Time API listening on http${process.env.USE_SSL ? 's' : ''}://${process.env.HOST || 'localhost'}:${PORT}`);
});
