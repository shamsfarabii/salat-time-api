export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jamaat_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prayer TEXT NOT NULL UNIQUE CHECK(prayer IN ('fajr', 'zuhr', 'asr', 'magrib', 'isha')),
  hours INTEGER NOT NULL CHECK(hours >= 0 AND hours <= 23),
  minutes INTEGER NOT NULL CHECK(minutes >= 0 AND minutes <= 59),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS jamaat_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  jamaat_time_id INTEGER NOT NULL REFERENCES jamaat_times(id) ON DELETE CASCADE,
  minutes_before INTEGER NOT NULL CHECK(minutes_before > 0),
  audio_file TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(jamaat_time_id, minutes_before)
);

CREATE INDEX IF NOT EXISTS idx_jamaat_reminders_jamaat_time
  ON jamaat_reminders(jamaat_time_id);
`;

/** @type {Record<number, string>} */
export const MIGRATION_SQL = {
  2: `
    CREATE TABLE jamaat_times_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prayer TEXT NOT NULL UNIQUE CHECK(prayer IN ('fajr', 'zuhr', 'asr', 'magrib', 'isha')),
      hours INTEGER NOT NULL CHECK(hours >= 0 AND hours <= 23),
      minutes INTEGER NOT NULL CHECK(minutes >= 0 AND minutes <= 59),
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    INSERT INTO jamaat_times_new (prayer, hours, minutes, enabled, created_at, updated_at)
    SELECT prayer, hours, minutes, enabled, created_at, updated_at
    FROM jamaat_times
    WHERE id IN (
      SELECT MAX(id)
      FROM jamaat_times
      GROUP BY prayer
    );

    CREATE TABLE jamaat_reminders_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jamaat_time_id INTEGER NOT NULL REFERENCES jamaat_times_new(id) ON DELETE CASCADE,
      minutes_before INTEGER NOT NULL CHECK(minutes_before > 0),
      audio_file TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(jamaat_time_id, minutes_before)
    );

    INSERT INTO jamaat_reminders_new (jamaat_time_id, minutes_before, audio_file, enabled, created_at)
    SELECT
      j_new.id,
      r.minutes_before,
      r.audio_file,
      r.enabled,
      r.created_at
    FROM jamaat_reminders r
    INNER JOIN jamaat_times j_old ON j_old.id = r.jamaat_time_id
    INNER JOIN jamaat_times_new j_new ON j_new.prayer = j_old.prayer;

    DROP TABLE jamaat_reminders;
    DROP TABLE jamaat_times;
    DROP TABLE IF EXISTS locations;

    ALTER TABLE jamaat_times_new RENAME TO jamaat_times;
    ALTER TABLE jamaat_reminders_new RENAME TO jamaat_reminders;

    CREATE INDEX IF NOT EXISTS idx_jamaat_reminders_jamaat_time
      ON jamaat_reminders(jamaat_time_id);
  `,
};
