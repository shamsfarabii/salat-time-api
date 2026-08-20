import { ISHRAQ_MINUTES_AFTER_SUNRISE } from '../constants.js';
import { addMinutes } from '../utils/date.js';

/**
 * Derive special-time playback moments from computed salah times.
 *
 * @param {Record<string, unknown>} salahTimes
 * @returns {{ sunrise: Date | null, tahajjud: Date | null, ishraq: Date | null }}
 */
export function resolveSpecialSalahTimes(salahTimes) {
  const sunrise =
    salahTimes.sunrise instanceof Date && !Number.isNaN(salahTimes.sunrise.getTime())
      ? salahTimes.sunrise
      : null;

  const night = salahTimes.night;
  const tahajjud =
    night &&
    typeof night === 'object' &&
    night.twoThird instanceof Date &&
    !Number.isNaN(night.twoThird.getTime())
      ? night.twoThird
      : null;

  const ishraq = sunrise ? addMinutes(sunrise, ISHRAQ_MINUTES_AFTER_SUNRISE) : null;

  return { sunrise, tahajjud, ishraq };
}
