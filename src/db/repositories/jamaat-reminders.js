import { getDb } from '../client.js';
import { assertMinutesBefore } from '../constants.js';
import { getJamaatTimeById } from './jamaat-times.js';

/**
 * @typedef {Object} JamaatReminderRow
 * @property {number} id
 * @property {number} jamaat_time_id
 * @property {number} minutes_before
 * @property {string} audio_file
 * @property {0 | 1} enabled
 * @property {string} created_at
 */

/**
 * @typedef {JamaatReminderRow & {
 *   prayer: string,
 *   jamaat_hours: number,
 *   jamaat_minutes: number,
 * }} JamaatReminderWithJamaat
 */

/**
 * @param {JamaatReminderRow} row
 */
function mapReminderRow(row) {
  return {
    ...row,
    enabled: /** @type {0 | 1} */ (row.enabled),
  };
}

/**
 * @param {number} jamaatTimeId
 * @param {{ dbPath?: string, includeDisabled?: boolean }} [options]
 * @returns {JamaatReminderRow[]}
 */
export function listRemindersByJamaatTime(jamaatTimeId, options = {}) {
  const db = getDb(options);
  const includeDisabled = options.includeDisabled ?? true;

  const query = includeDisabled
    ? `SELECT * FROM jamaat_reminders
       WHERE jamaat_time_id = ?
       ORDER BY minutes_before ASC`
    : `SELECT * FROM jamaat_reminders
       WHERE jamaat_time_id = ? AND enabled = 1
       ORDER BY minutes_before ASC`;

  return db.prepare(query).all(jamaatTimeId).map(mapReminderRow);
}

/**
 * @param {{ dbPath?: string }} [options]
 * @returns {JamaatReminderWithJamaat[]}
 */
export function listActiveReminders(options = {}) {
  const db = getDb(options);

  const rows = db
    .prepare(
      `SELECT
         r.id,
         r.jamaat_time_id,
         r.minutes_before,
         r.audio_file,
         r.enabled,
         r.created_at,
         j.prayer,
         j.hours AS jamaat_hours,
         j.minutes AS jamaat_minutes
       FROM jamaat_reminders r
       INNER JOIN jamaat_times j ON j.id = r.jamaat_time_id
       WHERE j.enabled = 1
         AND r.enabled = 1
       ORDER BY
         CASE j.prayer
           WHEN 'fajr' THEN 1
           WHEN 'zuhr' THEN 2
           WHEN 'asr' THEN 3
           WHEN 'magrib' THEN 4
           WHEN 'isha' THEN 5
         END,
         r.minutes_before`
    )
    .all();

  return rows.map((row) => ({
    ...mapReminderRow(row),
    prayer: row.prayer,
    jamaat_hours: row.jamaat_hours,
    jamaat_minutes: row.jamaat_minutes,
  }));
}

/**
 * @param {number} id
 * @param {{ dbPath?: string }} [options]
 * @returns {JamaatReminderRow | undefined}
 */
export function getReminderById(id, options = {}) {
  const db = getDb(options);
  const row = db.prepare('SELECT * FROM jamaat_reminders WHERE id = ?').get(id);
  return row ? mapReminderRow(row) : undefined;
}

/**
 * @param {{
 *   jamaatTimeId: number,
 *   minutesBefore: number,
 *   audioFile: string,
 *   enabled?: boolean,
 *   dbPath?: string,
 * }} input
 * @returns {JamaatReminderRow}
 */
export function upsertJamaatReminder(input) {
  const db = getDb(input);
  assertMinutesBefore(input.minutesBefore);

  const jamaatTime = getJamaatTimeById(input.jamaatTimeId, input);
  if (!jamaatTime) {
    throw new Error(`Jamaat time not found: ${input.jamaatTimeId}`);
  }

  const audioFile = String(input.audioFile).trim();
  if (!audioFile) {
    throw new Error('audioFile is required');
  }

  const enabled = input.enabled === false ? 0 : 1;

  db.prepare(
    `INSERT INTO jamaat_reminders (jamaat_time_id, minutes_before, audio_file, enabled)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(jamaat_time_id, minutes_before) DO UPDATE SET
       audio_file = excluded.audio_file,
       enabled = excluded.enabled`
  ).run(input.jamaatTimeId, input.minutesBefore, audioFile, enabled);

  const row = db
    .prepare(
      'SELECT * FROM jamaat_reminders WHERE jamaat_time_id = ? AND minutes_before = ?'
    )
    .get(input.jamaatTimeId, input.minutesBefore);

  if (!row) {
    throw new Error('Failed to save jamaat reminder');
  }

  return mapReminderRow(row);
}

/**
 * @param {number} id
 * @param {{
 *   minutesBefore?: number,
 *   audioFile?: string,
 *   enabled?: boolean,
 *   dbPath?: string,
 * }} updates
 * @returns {JamaatReminderRow | undefined}
 */
export function updateJamaatReminder(id, updates) {
  const db = getDb(updates);
  const existing = getReminderById(id, updates);

  if (!existing) {
    return undefined;
  }

  const minutesBefore = updates.minutesBefore ?? existing.minutes_before;
  assertMinutesBefore(minutesBefore);

  const audioFile =
    updates.audioFile !== undefined
      ? String(updates.audioFile).trim()
      : existing.audio_file;

  if (!audioFile) {
    throw new Error('audioFile cannot be empty');
  }

  const enabled =
    updates.enabled === undefined ? existing.enabled : updates.enabled ? 1 : 0;

  if (minutesBefore !== existing.minutes_before) {
    const conflict = db
      .prepare(
        `SELECT id FROM jamaat_reminders
         WHERE jamaat_time_id = ? AND minutes_before = ? AND id != ?`
      )
      .get(existing.jamaat_time_id, minutesBefore, id);

    if (conflict) {
      throw new Error(
        `A reminder already exists ${minutesBefore} minutes before this jamaat time`
      );
    }
  }

  db.prepare(
    `UPDATE jamaat_reminders
     SET minutes_before = ?, audio_file = ?, enabled = ?
     WHERE id = ?`
  ).run(minutesBefore, audioFile, enabled, id);

  return getReminderById(id, updates);
}

/**
 * @param {number} id
 * @param {{ dbPath?: string }} [options]
 * @returns {boolean}
 */
export function deleteJamaatReminder(id, options = {}) {
  const db = getDb(options);
  const result = db.prepare('DELETE FROM jamaat_reminders WHERE id = ?').run(id);
  return result.changes > 0;
}
