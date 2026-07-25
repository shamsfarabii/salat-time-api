import { addMinutes } from '../utils/date.js';
import { getMagribTime } from './magrib.js';

// A small caution margin is added after Magrib before iftar is declared. The
// margin is smaller when an observed local sunset time is supplied, since it is
// more reliable than the calculated one.
export const DEFAULT_CAUTION_MINUTES = 4;
export const LOCAL_SUNSET_CAUTION_MINUTES = 2;

export function getIftarTime(date, latitude, longitude, options = {}) {
  const { localMagribTime = null, cautionMinutes = null } = options;

  const calculatedMagrib = getMagribTime(date, latitude, longitude);

  const hasLocalMagrib = localMagribTime instanceof Date;
  const baseMagribTime = hasLocalMagrib ? localMagribTime : calculatedMagrib;

  const resolvedCautionMinutes =
    cautionMinutes ??
    (hasLocalMagrib ? LOCAL_SUNSET_CAUTION_MINUTES : DEFAULT_CAUTION_MINUTES);

  const iftar = baseMagribTime
    ? addMinutes(baseMagribTime, resolvedCautionMinutes)
    : null;

  return {
    magrib: calculatedMagrib,
    localMagribTime: hasLocalMagrib ? localMagribTime : null,
    baseMagribTime,
    cautionMinutes: resolvedCautionMinutes,
    iftar,
  };
}
