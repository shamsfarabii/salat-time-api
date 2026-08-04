import { getMatchingPrayer } from '../utils/time-match.js';
import { ADHAN_PRAYERS } from './constants.js';

/**
 * @param {Date} now
 * @param {Record<string, Date | null | undefined>} salahTimes
 * @param {string[]} [prayers]
 * @returns {string | null}
 */
export function getMatchingAdhanPrayer(now, salahTimes, prayers = ADHAN_PRAYERS) {
  return getMatchingPrayer(now, salahTimes, prayers);
}
