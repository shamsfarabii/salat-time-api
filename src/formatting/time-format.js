export function getTimezoneOffsetSeconds(date, timeZone) {
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

export function formatApiDate(date, timeZone) {
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

export function formatTimeSlot(time, timeZone) {
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
