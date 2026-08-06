/**
 * Truncate a Date to the start of its minute (drops seconds and milliseconds).
 * @param {Date} date
 * @returns {number} Epoch milliseconds at minute boundary
 */
export function truncateToMinute(date) {
  return Math.floor(date.getTime() / 60_000) * 60_000;
}

/**
 * Truncate a Date to the start of its second (drops milliseconds).
 * @param {Date} date
 * @returns {number} Epoch milliseconds at second boundary
 */
export function truncateToSecond(date) {
  return Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * @param {Date | null | undefined} a
 * @param {Date | null | undefined} b
 * @returns {boolean}
 */
export function isSameSecond(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) {
    return false;
  }

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return false;
  }

  return truncateToSecond(a) === truncateToSecond(b);
}

/**
 * @param {Date | null | undefined} a
 * @param {Date | null | undefined} b
 * @returns {boolean}
 */
export function isSameMinute(a, b) {
  if (!(a instanceof Date) || !(b instanceof Date)) {
    return false;
  }

  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) {
    return false;
  }

  return truncateToMinute(a) === truncateToMinute(b);
}

/**
 * Find the first prayer whose computed time matches `now` at minute precision.
 *
 * @param {Date} now
 * @param {Record<string, Date | null | undefined>} timeEntries Prayer name → time
 * @param {string[]} [prayerOrder] Keys to check, in priority order
 * @returns {string | null} Matching prayer name, or null when none match
 */
export function getMatchingPrayer(now, timeEntries, prayerOrder) {
  for (const prayer of prayerOrder) {
    const time = timeEntries[prayer];
    if (isSameMinute(now, time)) {
      return prayer;
    }
  }

  return null;
}
