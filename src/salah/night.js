import { addMilliseconds } from '../utils/date.js';

const NULL_NIGHT = {
  start: null,
  end: null,
  durationMs: null,
  oneThird: null,
  half: null,
  twoThird: null,
  lastSixth: null,
};

/**
 * @param {Date | null} magrib     — sunset time for this day
 * @param {Date | null} nextDayFajr — fajr time for the following day
 * @returns {{ start, end, durationMs, oneThird, half, twoThird, lastSixth }}
 */
export function computeNightTimes(magrib, nextDayFajr) {
  if (!magrib || !nextDayFajr) {
    return { ...NULL_NIGHT, start: magrib ?? null, end: nextDayFajr ?? null };
  }

  const durationMs = nextDayFajr.getTime() - magrib.getTime();

  return {
    start: magrib,
    end: nextDayFajr,
    durationMs,
    oneThird: addMilliseconds(magrib, durationMs / 3),
    half: addMilliseconds(magrib, durationMs / 2),
    twoThird: addMilliseconds(magrib, (durationMs * 2) / 3),
    lastSixth: addMilliseconds(nextDayFajr, -durationMs / 6),
  };
}
