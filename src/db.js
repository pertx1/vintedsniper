'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const MIGRATIONS = [
  // 1: initial schema
  `
  CREATE TABLE monitors (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL,
    search_text     TEXT    NOT NULL DEFAULT '',
    kind            TEXT    NOT NULL DEFAULT 'custom',   -- sneakers | clothing | custom
    gender          TEXT    NOT NULL DEFAULT '',         -- men | women | ''
    subcategory     TEXT    NOT NULL DEFAULT '',
    catalog_ids     TEXT    NOT NULL DEFAULT '[]',       -- JSON array of ints
    brand_ids       TEXT    NOT NULL DEFAULT '[]',
    size_ids        TEXT    NOT NULL DEFAULT '[]',
    status_ids      TEXT    NOT NULL DEFAULT '[]',
    extra_params    TEXT    NOT NULL DEFAULT '{}',       -- other Vinted filters taken from a pasted URL
    price_from      REAL,
    price_to        REAL    NOT NULL,
    exclude_words   TEXT    NOT NULL DEFAULT '[]',
    check_description INTEGER NOT NULL DEFAULT 0,
    source_url      TEXT    NOT NULL DEFAULT '',
    enabled         INTEGER NOT NULL DEFAULT 1,
    primed          INTEGER NOT NULL DEFAULT 0,          -- 0 = next pass only marks items as seen
    status          TEXT    NOT NULL DEFAULT 'pending',  -- pending | ok | limited | error | paused
    status_message  TEXT    NOT NULL DEFAULT '',
    last_check_at   INTEGER,
    last_success_at INTEGER,
    failures        INTEGER NOT NULL DEFAULT 0,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE TABLE seen_items (
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    item_id    INTEGER NOT NULL,
    seen_at    INTEGER NOT NULL,
    PRIMARY KEY (monitor_id, item_id)
  ) WITHOUT ROWID;
  CREATE INDEX seen_items_seen_at ON seen_items(seen_at);

  CREATE TABLE found_items (
    item_id      INTEGER PRIMARY KEY,
    title        TEXT NOT NULL,
    brand        TEXT NOT NULL DEFAULT '',
    size         TEXT NOT NULL DEFAULT '',
    condition    TEXT NOT NULL DEFAULT '',
    price        REAL,
    total_price  REAL,
    currency     TEXT NOT NULL DEFAULT 'EUR',
    photo_url    TEXT NOT NULL DEFAULT '',
    url          TEXT NOT NULL,
    published_at INTEGER,
    found_at     INTEGER NOT NULL,
    notified     INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX found_items_found_at ON found_items(found_at DESC);

  CREATE TABLE found_item_monitors (
    item_id    INTEGER NOT NULL REFERENCES found_items(item_id) ON DELETE CASCADE,
    monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    PRIMARY KEY (item_id, monitor_id)
  ) WITHOUT ROWID;
  CREATE INDEX found_item_monitors_monitor ON found_item_monitors(monitor_id);

  CREATE TABLE push_subscriptions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint     TEXT NOT NULL UNIQUE,
    p256dh       TEXT NOT NULL,
    auth         TEXT NOT NULL,
    user_agent   TEXT NOT NULL DEFAULT '',
    created_at   INTEGER NOT NULL,
    last_ok_at   INTEGER
  );

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE logs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    ts         INTEGER NOT NULL,
    level      TEXT NOT NULL,
    source     TEXT NOT NULL,
    message    TEXT NOT NULL,
    monitor_id INTEGER
  );

  CREATE TABLE sessions (
    token      TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    user_agent TEXT NOT NULL DEFAULT ''
  );
  `,
  // 2: alerts moved from Web Push to Telegram
  `
  DROP TABLE IF EXISTS push_subscriptions;
  DELETE FROM settings WHERE key IN ('quiet_summary', 'quiet_pending');
  `,
];

function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}

function migrate(db) {
  const current = db.pragma('user_version', { simple: true });
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

module.exports = { openDatabase };
