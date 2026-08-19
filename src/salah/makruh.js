import { addMinutes } from '../utils/date.js';

export const ASR_MAKRUH_MINUTES_BEFORE_MAGRIB = 30;

/**
 * @param {Date | null} magrib   — pre-computed sunset time
 * @param {Date | null} halfNight — pre-computed midnight (half of night period)
 * @returns {{ asrMakruhStart: Date | null, ishaMakruhStart: Date | null }}
 */
export function computeMakruhTimes(magrib, halfNight) {
  return {
    asrMakruhStart: magrib ? addMinutes(magrib, -ASR_MAKRUH_MINUTES_BEFORE_MAGRIB) : null,
    ishaMakruhStart: halfNight,
  };
}
