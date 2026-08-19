import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSalahTimes } from '../src/index.js';

/**
 * Snapshot tests that lock down the exact millisecond output of computeSalahTimes.
 * Every refactor must keep these values identical. Any difference is a regression
 * until explicitly reviewed and accepted as a behavioral change.
 */

function assertField(actual, expected, label) {
  if (expected === null) {
    assert.strictEqual(actual, null, `${label} should be null`);
  } else if (typeof expected === 'number' && !Number.isInteger(expected)) {
    assert.strictEqual(actual, expected, `${label} value mismatch`);
  } else if (typeof expected === 'object') {
    assertSnapshot(actual, expected, label);
  } else {
    // Integer expected = epoch ms for a Date field, or a plain number like durationMs
    if (actual instanceof Date) {
      assert.strictEqual(actual.getTime(), expected, `${label} ms mismatch`);
    } else {
      assert.strictEqual(actual, expected, `${label} value mismatch`);
    }
  }
}

function assertSnapshot(actual, expected, prefix = '') {
  for (const [key, value] of Object.entries(expected)) {
    const path = prefix ? `${prefix}.${key}` : key;
    assertField(actual[key], value, path);
  }
}

describe('computeSalahTimes snapshots', () => {
  it('Dhaka summer (2024-06-15)', () => {
    const times = computeSalahTimes(new Date(2024, 5, 15), {
      latitude: 23.8103,
      longitude: 90.4125,
    });

    assertSnapshot(times, {
      fajr: 1718401392738,
      sehri: 1718401392738,
      sunrise: 1718406659005,
      zuhr: 1718431136782,
      asr: 1718443047439,
      asrHanafi: 1718447965683,
      magrib: 1718455617390,
      iftar: 1718455857390,
      redSkyEnd: 1718458973859,
      isha: 1718460886057,
      asrMakruhStart: 1718453817390,
      ishaMakruhStart: 1718471707802,
      night: {
        start: 1718455617390,
        end: 1718487798214,
        durationMs: 32180824,
        oneThird: 1718466344331,
        twoThird: 1718477071272,
        half: 1718471707802,
        lastSixth: 1718482434743,
      },
    });
  });

  it('Dhaka winter (2024-12-21)', () => {
    const times = computeSalahTimes(new Date(2024, 11, 21), {
      latitude: 23.8103,
      longitude: 90.4125,
    });

    assertSnapshot(times, {
      fajr: 1734736540398,
      sehri: 1734736540398,
      sunrise: 1734741391215,
      zuhr: 1734760593467,
      asr: 1734771396640,
      asrHanafi: 1734774041538,
      magrib: 1734779795734,
      iftar: 1734780035734,
      redSkyEnd: 1734782977262,
      isha: 1734784646559,
      asrMakruhStart: 1734777995734,
      ishaMakruhStart: 1734801382956,
      night: {
        start: 1734779795734,
        end: 1734822970178,
        durationMs: 43174444,
        oneThird: 1734794187215,
        twoThird: 1734808578696,
        half: 1734801382956,
        lastSixth: 1734815774437,
      },
    });
  });

  it('Quito equatorial (2024-01-01)', () => {
    const times = computeSalahTimes(new Date(2024, 0, 1), {
      latitude: -0.1807,
      longitude: -78.4678,
    });

    assertSnapshot(times, {
      fajr: 1704103103097,
      sehri: 1704103103097,
      sunrise: 1704107597041,
      zuhr: 1704129441182,
      asr: null,
      asrHanafi: null,
      magrib: 1704064854346,
      iftar: 1704065094346,
      redSkyEnd: 1704067772765,
      isha: 1704069349346,
      asrMakruhStart: 1704063054346,
      ishaMakruhStart: 1704127194416,
      night: {
        start: 1704064854346,
        end: 1704189534486,
        durationMs: 124680140,
        oneThird: 1704106414392,
        twoThird: 1704147974439,
        half: 1704127194416,
        lastSixth: 1704168754462,
      },
    });
  });

  it('Stockholm high latitude summer (2024-06-21)', () => {
    const times = computeSalahTimes(new Date(2024, 5, 21), {
      latitude: 59.3293,
      longitude: 18.0686,
    });

    assertSnapshot(times, {
      fajr: null,
      sehri: null,
      sunrise: 1718933461604,
      zuhr: 1718966979913,
      asr: 1718983792917,
      asrHanafi: 1718988507155,
      magrib: 1718914085669,
      iftar: 1718914325669,
      redSkyEnd: null,
      isha: null,
      asrMakruhStart: 1718912285669,
      ishaMakruhStart: null,
      night: {
        start: 1718914085669,
        end: null,
        durationMs: null,
        oneThird: null,
        twoThird: null,
        half: null,
        lastSixth: null,
      },
    });
  });
});
