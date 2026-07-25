import { DAY_MS } from '../constants.js';

// Date helpers shared across the salah modules. Keeping them in one place
// avoids the per-module re-implementations of add/subtract/start-of-day logic.

export function startOfDay(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

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
