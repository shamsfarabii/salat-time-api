/**
 * @param {Record<string, Date | null | undefined>} salahTimes
 * @param {'standard' | 'hanafi'} asrMadhab
 * @returns {Record<string, Date | null | undefined>}
 */
export function resolveAdhanSalahTimes(salahTimes, asrMadhab) {
  if (asrMadhab === 'hanafi') {
    return { ...salahTimes, asr: salahTimes.asrHanafi };
  }

  return salahTimes;
}
