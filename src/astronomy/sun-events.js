import { getSolarElevation } from './solar-position.js';
import { startOfDay, endOfDay } from '../utils/date.js';

// Higher-level solar events derived from the elevation curve: the times the sun
// crosses a target elevation (used for dawn, sunrise, sunset, isha, asr) and
// solar noon (zawal).

const SCAN_STEP_MS = 5 * 60 * 1000; // coarse 5-minute sweep to bracket crossings
const BISECTION_ITERATIONS = 50; // refines a bracketed crossing to ~ms precision
const TERNARY_ITERATIONS = 100; // refines the solar-noon search
const DIRECTION_PROBE_MS = 1000; // ±1s sample to classify rising vs. setting

function elevationAt(timeMs, latitude, longitude) {
  return getSolarElevation(new Date(timeMs), latitude, longitude);
}

// True when the elevation curve touches or straddles the target between two
// successive samples.
function isCrossing(previousDifference, currentDifference) {
  return (
    previousDifference === 0 ||
    currentDifference === 0 ||
    previousDifference * currentDifference < 0
  );
}

// Binary-search a bracketed interval down to the instant the sun passes the
// target elevation. `lowDifference` is the signed (elevation - target) at `lowMs`.
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

// Classify a crossing as the sun rising past ('upward') or setting past
// ('downward') the target, by sampling just before and after the instant.
function crossingDirection(timeMs, latitude, longitude) {
  const before = elevationAt(timeMs - DIRECTION_PROBE_MS, latitude, longitude);
  const after = elevationAt(timeMs + DIRECTION_PROBE_MS, latitude, longitude);
  return after > before ? 'upward' : 'downward';
}

// All instants during `date` when the sun crosses `targetElevation`.
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
 * The sun's crossings of `targetElevation` during `date`, plus convenience
 * handles for the first rising crossing (`dawn`) and first setting crossing
 * (`dusk`).
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
 * Solar noon (zawal): the instant the sun reaches its highest elevation for the
 * day, found by ternary search over the unimodal elevation curve.
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
