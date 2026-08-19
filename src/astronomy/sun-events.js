import { getSolarElevation } from './solar-position.js';
import { startOfDay, endOfDay } from '../utils/date.js';

const SCAN_STEP_MS = 5 * 60 * 1000;
const BISECTION_ITERATIONS = 50;
const TERNARY_ITERATIONS = 100;
const DIRECTION_PROBE_MS = 1000;

function elevationAt(timeMs, latitude, longitude) {
  return getSolarElevation(new Date(timeMs), latitude, longitude);
}

function isCrossing(previousDifference, currentDifference) {
  return (
    previousDifference === 0 ||
    currentDifference === 0 ||
    previousDifference * currentDifference < 0
  );
}

function refineCrossing(lowMs, highMs, latitude, longitude, targetElevation, lowDifference) {
  let low = lowMs;
  let high = highMs;

  for (let i = 0; i < BISECTION_ITERATIONS; i += 1) {
    const middle = Math.floor((low + high) / 2);
    const middleDifference =
      elevationAt(middle, latitude, longitude) - targetElevation;

    if (lowDifference * middleDifference <= 0) {
      high = middle;
    } else {
      low = middle;
    }
  }

  return high;
}

function crossingDirection(timeMs, latitude, longitude) {
  const before = elevationAt(timeMs - DIRECTION_PROBE_MS, latitude, longitude);
  const after = elevationAt(timeMs + DIRECTION_PROBE_MS, latitude, longitude);
  return after > before ? 'upward' : 'downward';
}

function findElevationCrossings(date, latitude, longitude, targetElevation) {
  const dayStartMs = startOfDay(date).getTime();
  const dayEndMs = endOfDay(date).getTime();

  const crossings = [];
  let previousTimeMs = dayStartMs;
  let previousDifference =
    elevationAt(previousTimeMs, latitude, longitude) - targetElevation;

  for (
    let currentTimeMs = dayStartMs + SCAN_STEP_MS;
    currentTimeMs <= dayEndMs;
    currentTimeMs += SCAN_STEP_MS
  ) {
    const currentDifference =
      elevationAt(currentTimeMs, latitude, longitude) - targetElevation;

    if (isCrossing(previousDifference, currentDifference)) {
      const crossingTimeMs = refineCrossing(
        previousTimeMs,
        currentTimeMs,
        latitude,
        longitude,
        targetElevation,
        previousDifference
      );
      const crossingTime = new Date(crossingTimeMs);

      crossings.push({
        time: crossingTime,
        elevation: getSolarElevation(crossingTime, latitude, longitude),
        direction: crossingDirection(crossingTimeMs, latitude, longitude),
      });
    }

    previousTimeMs = currentTimeMs;
    previousDifference = currentDifference;
  }

  return crossings;
}

/**
 * Finds the times during a day when the sun crosses a target elevation.
 * Scans in 5-minute steps then bisects to sub-millisecond precision.
 *
 * @param {Date} date
 * @param {number} latitude        — degrees
 * @param {number} longitude       — degrees
 * @param {number} targetElevation — degrees (e.g. -18 for astronomical twilight)
 * @returns {{ dawn: Date | null, dusk: Date | null, crossings: Array }}
 */
export function getSunElevationCrossings(date, latitude, longitude, targetElevation) {
  const crossings = findElevationCrossings(date, latitude, longitude, targetElevation);

  return {
    dawn: crossings.find((crossing) => crossing.direction === 'upward')?.time ?? null,
    dusk: crossings.find((crossing) => crossing.direction === 'downward')?.time ?? null,
    crossings,
  };
}

/**
 * Finds solar noon (the moment of maximum sun elevation) for a given day
 * using ternary search.
 *
 * @param {Date} date
 * @param {number} latitude  — degrees
 * @param {number} longitude — degrees
 * @returns {{ time: Date, maxElevation: number }}
 */
export function getSolarNoon(date, latitude, longitude) {
  let low = startOfDay(date).getTime();
  let high = endOfDay(date).getTime();

  for (let i = 0; i < TERNARY_ITERATIONS; i += 1) {
    const leftThird = low + (high - low) / 3;
    const rightThird = high - (high - low) / 3;

    if (
      elevationAt(leftThird, latitude, longitude) <
      elevationAt(rightThird, latitude, longitude)
    ) {
      low = leftThird;
    } else {
      high = rightThird;
    }
  }

  const time = new Date((low + high) / 2);

  return {
    time,
    maxElevation: getSolarElevation(time, latitude, longitude),
  };
}
