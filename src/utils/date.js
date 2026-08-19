import { DAY_MS } from '../constants.js';

/**
 * Returns midnight at the start of the given date's calendar day.
 *
 * IMPORTANT: Uses the server's local timezone via Date.setHours(0,0,0,0),
 * so the scan window for solar crossings depends on where the server runs.
 * This is intentional current behavior — changing to UTC would shift which
 * crossings fall within the scanned window.
 *
 * @param {Date} date
 * @returns {Date}
 */
export function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** Returns the instant 24 hours after startOfDay. See startOfDay for timezone note. */
export function endOfDay(date) {
  return new Date(startOfDay(date).getTime() + DAY_MS);
}

export function nextDay(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}

export function addMilliseconds(date, milliseconds) {
  return new Date(date.getTime() + milliseconds);
}

export function addMinutes(date, minutes) {
  return addMilliseconds(date, minutes * 60 * 1000);
}
