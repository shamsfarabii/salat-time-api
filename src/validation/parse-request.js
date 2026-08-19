const DEFAULT_TIMEZONE = 'Asia/Dhaka';

const MONTH_INDEX_BY_NAME = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

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
    ? DEFAULT_TIMEZONE
    : String(value);

  try {
    new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
    return { ok: true, value: timeZone };
  } catch {
    return { ok: false, error: 'tzname must be a valid IANA timezone (e.g. Asia/Dhaka)' };
  }
}

/**
 * Validates and normalizes raw API input (query params or body) into a
 * typed request object. Returns { ok: true, value } or { ok: false, error }.
 *
 * @param {Record<string, unknown>} input
 * @returns {{ ok: true, value: { lat, lon, latText, lonText, date, tzname, is_gps, name } }
 *         | { ok: false, error: string }}
 */
export function resolveRequest(input) {
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
