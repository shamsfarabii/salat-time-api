import { addMinutes } from '../utils/date.js';
import { getMagribTime } from './magrib.js';

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
