import { getDb } from '../client.js';
import {
  assertJamaatPrayer,
  assertTimeOfDay,
} from '../constants.js';

/**
 * @typedef {import('../constants.js').JamaatPrayer} JamaatPrayer
 */

/**
 * @typedef {Object} JamaatTimeRow
 * @property {number} id
 * @property {JamaatPrayer} prayer
 * @property {number} hours
 * @property {number} minutes
 * @property {0 | 1} enabled
 * @property {string} created_at
 * @property {string} updated_at
 */

const PRAYER_ORDER_SQL = `
  CASE prayer
    WHEN 'fajr' THEN 1
    WHEN 'zuhr' THEN 2
    WHEN 'asr' THEN 3
    WHEN 'magrib' THEN 4
    WHEN 'isha' THEN 5
  END
`;

/**
 * @param {JamaatTimeRow} row
 */
function mapJamaatTimeRow(row) {
  return {
    ...row,
    enabled: /** @type {0 | 1} */ (row.enabled),
  };
}

/**
 * @param {{ dbPath?: string, includeDisabled?: boolean }} [options]
 * @returns {JamaatTimeRow[]}
 */
export function listJamaatTimes(options = {}) {
  const db = getDb(options);
  const includeDisabled = options.includeDisabled ?? true;

  const query = includeDisabled
    ? `SELECT * FROM jamaat_times ORDER BY ${PRAYER_ORDER_SQL}`
    : `SELECT * FROM jamaat_times WHERE enabled = 1 ORDER BY ${PRAYER_ORDER_SQL}`;

  return db.prepare(query).all().map(mapJamaatTimeRow);
}

/**
 * @param {number} id
 * @param {{ dbPath?: string }} [options]
 * @returns {JamaatTimeRow | undefined}
 */
export function getJamaatTimeById(id, options = {}) {
  const db = getDb(options);
  const row = db.prepare('SELECT * FROM jamaat_times WHERE id = ?').get(id);
  return row ? mapJamaatTimeRow(row) : undefined;
}

/**
 * @param {string} prayer
 * @param {{ dbPath?: string }} [options]
 * @returns {JamaatTimeRow | undefined}
 */
export function getJamaatTimeByPrayer(prayer, options = {}) {
  const db = getDb(options);
  const normalizedPrayer = assertJamaatPrayer(prayer);
  const row = db
    .prepare('SELECT * FROM jamaat_times WHERE prayer = ?')
    .get(normalizedPrayer);

  return row ? mapJamaatTimeRow(row) : undefined;
}

/**
 * @param {{
 *   prayer: string,
 *   hours: number,
 *   minutes: number,
 *   enabled?: boolean,
 *   dbPath?: string,
 * }} input
 * @returns {JamaatTimeRow}
 */
export function upsertJamaatTime(input) {
  const db = getDb(input);
  const prayer = assertJamaatPrayer(input.prayer);
  assertTimeOfDay(input.hours, input.minutes);

  const enabled = input.enabled === false ? 0 : 1;

  db.prepare(
    `INSERT INTO jamaat_times (prayer, hours, minutes, enabled)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(prayer) DO UPDATE SET
       hours = excluded.hours,
       minutes = excluded.minutes,
       enabled = excluded.enabled,
       updated_at = datetime('now')`
  ).run(prayer, input.hours, input.minutes, enabled);

  const row = getJamaatTimeByPrayer(prayer, input);
  if (!row) {
    throw new Error(`Failed to save jamaat time for ${prayer}`);
  }

  return row;
}

/**
 * @param {number} id
 * @param {{ hours?: number, minutes?: number, enabled?: boolean, dbPath?: string }} updates
 * @returns {JamaatTimeRow | undefined}
 */
export function updateJamaatTime(id, updates) {
  const db = getDb(updates);
  const existing = getJamaatTimeById(id, updates);

  if (!existing) {
    return undefined;
  }

  const hours = updates.hours ?? existing.hours;
  const minutes = updates.minutes ?? existing.minutes;
  assertTimeOfDay(hours, minutes);

  const enabled =
    updates.enabled === undefined ? existing.enabled : updates.enabled ? 1 : 0;

  db.prepare(
    `UPDATE jamaat_times
     SET hours = ?, minutes = ?, enabled = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(hours, minutes, enabled, id);

  return getJamaatTimeById(id, updates);
}

/**
 * @param {number} id
 * @param {{ dbPath?: string }} [options]
 * @returns {boolean}
 */
export function deleteJamaatTime(id, options = {}) {
  const db = getDb(options);
  const result = db.prepare('DELETE FROM jamaat_times WHERE id = ?').run(id);
  return result.changes > 0;
}
