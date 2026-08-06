import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { DEFAULT_DB_PATH } from './constants.js';
import { CREATE_TABLES_SQL, MIGRATION_SQL, SCHEMA_VERSION } from './schema.js';

/** @type {Database.Database | null} */
let dbInstance = null;

/**
 * @param {string} dbPath
 */
function ensureDbDirectory(dbPath) {
  const directory = path.dirname(dbPath);
  fs.mkdirSync(directory, { recursive: true });
}

/**
 * @param {Database.Database} db
 */
function getAppliedSchemaVersion(db) {
  const row = db
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get();

  return typeof row?.version === 'number' ? row.version : 0;
}

/**
 * @param {Database.Database} db
 * @param {string} tableName
 */
function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(tableName);

  return Boolean(row);
}

/**
 * @param {Database.Database} db
 */
function applyMigrations(db) {
  db.exec(CREATE_TABLES_SQL);

  const currentVersion = getAppliedSchemaVersion(db);

  if (currentVersion < 2 && tableExists(db, 'locations')) {
    db.exec(MIGRATION_SQL[2]);
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(2);
    return;
  }

  if (currentVersion === 0) {
    db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(SCHEMA_VERSION);
  }
}

/**
 * @param {{ dbPath?: string }} [options]
 * @returns {Database.Database}
 */
export function getDb(options = {}) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  ensureDbDirectory(dbPath);

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  applyMigrations(dbInstance);

  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
