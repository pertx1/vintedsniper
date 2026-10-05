'use strict';

/**
 * Data access helpers on top of the SQLite database.
 */

const SETTING_DEFAULTS = {
  poll_interval_seconds: null, // null = use POLL_INTERVAL_SECONDS from .env
  notifications_enabled: true,
  quiet_enabled: false,
  quiet_start: '00:00',
  quiet_end: '08:00',
  quiet_summary: true,
  quiet_pending: 0,
  max_item_age_hours: 24,
};

const JSON_FIELDS = ['catalog_ids', 'brand_ids', 'size_ids', 'status_ids', 'exclude_words', 'extra_params'];

function rowToMonitor(row) {
  if (!row) return null;
  const m = { ...row };
  for (const f of JSON_FIELDS) {
    try {
      m[f] = JSON.parse(row[f]);
    } catch {
      m[f] = f === 'extra_params' ? {} : [];
    }
  }
  m.enabled = !!row.enabled;
  m.primed = !!row.primed;
  m.check_description = !!row.check_description;
  return m;
}

function createStore(db) {
  const stmts = {
    listMonitors: db.prepare('SELECT * FROM monitors ORDER BY id'),
    getMonitor: db.prepare('SELECT * FROM monitors WHERE id = ?'),
    deleteMonitor: db.prepare('DELETE FROM monitors WHERE id = ?'),
    isSeen: db.prepare('SELECT 1 FROM seen_items WHERE monitor_id = ? AND item_id = ?'),
    // seen_at is refreshed every time the item shows up in the results, so pruning
    // only forgets items that have long disappeared from the newest results.
    markSeen: db.prepare(`
      INSERT INTO seen_items (monitor_id, item_id, seen_at) VALUES (?, ?, ?)
      ON CONFLICT(monitor_id, item_id) DO UPDATE SET seen_at = excluded.seen_at`),
    pruneSeen: db.prepare('DELETE FROM seen_items WHERE seen_at < ?'),
    getFound: db.prepare('SELECT item_id FROM found_items WHERE item_id = ?'),
    insertFound: db.prepare(`
      INSERT INTO found_items (item_id, title, brand, size, condition, price, total_price, currency,
                               photo_url, url, published_at, found_at, notified)
      VALUES (@item_id, @title, @brand, @size, @condition, @price, @total_price, @currency,
              @photo_url, @url, @published_at, @found_at, 0)`),
    linkFound: db.prepare('INSERT OR IGNORE INTO found_item_monitors (item_id, monitor_id) VALUES (?, ?)'),
    setNotified: db.prepare('UPDATE found_items SET notified = ? WHERE item_id = ?'),
    pruneFound: db.prepare('DELETE FROM found_items WHERE found_at < ?'),
    getSetting: db.prepare('SELECT value FROM settings WHERE key = ?'),
    setSetting: db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ),
    listSubs: db.prepare('SELECT * FROM push_subscriptions'),
    upsertSub: db.prepare(`
      INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth,
                                          user_agent = excluded.user_agent`),
    deleteSubByEndpoint: db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?'),
    deleteSubById: db.prepare('DELETE FROM push_subscriptions WHERE id = ?'),
    subOk: db.prepare('UPDATE push_subscriptions SET last_ok_at = ? WHERE id = ?'),
  };

  const monitorColumns = [
    'name', 'search_text', 'kind', 'gender', 'subcategory', 'catalog_ids', 'brand_ids', 'size_ids',
    'status_ids', 'extra_params', 'price_from', 'price_to', 'exclude_words', 'check_description',
    'source_url', 'enabled',
  ];

  function serializeMonitor(data) {
    const out = {};
    for (const col of monitorColumns) {
      if (!(col in data)) continue;
      let v = data[col];
      if (JSON_FIELDS.includes(col)) v = JSON.stringify(v);
      if (typeof v === 'boolean') v = v ? 1 : 0;
      out[col] = v;
    }
    return out;
  }

  const store = {
    // ---- monitors ----
    listMonitors() {
      return stmts.listMonitors.all().map(rowToMonitor);
    },
    getMonitor(id) {
      return rowToMonitor(stmts.getMonitor.get(id));
    },
    createMonitor(data) {
      const now = Date.now();
      const row = { ...serializeMonitor(data), created_at: now, updated_at: now, primed: 0 };
      row.status = row.enabled === 0 ? 'paused' : 'pending';
      const cols = Object.keys(row);
      const info = db
        .prepare(`INSERT INTO monitors (${cols.join(', ')}) VALUES (${cols.map((c) => '@' + c).join(', ')})`)
        .run(row);
      return store.getMonitor(info.lastInsertRowid);
    },
    updateMonitor(id, data) {
      const row = serializeMonitor(data);
      row.updated_at = Date.now();
      const sets = Object.keys(row).map((c) => `${c} = @${c}`);
      db.prepare(`UPDATE monitors SET ${sets.join(', ')} WHERE id = @id`).run({ ...row, id });
      return store.getMonitor(id);
    },
    /** Patch runtime fields (status, primed...) without touching updated_at. */
    patchMonitorState(id, fields) {
      const row = { ...fields };
      if ('primed' in row) row.primed = row.primed ? 1 : 0;
      const sets = Object.keys(row).map((c) => `${c} = @${c}`);
      db.prepare(`UPDATE monitors SET ${sets.join(', ')} WHERE id = @id`).run({ ...row, id });
    },
    deleteMonitor(id) {
      return stmts.deleteMonitor.run(id).changes > 0;
    },

    // ---- seen items ----
    isSeen(monitorId, itemId) {
      return !!stmts.isSeen.get(monitorId, itemId);
    },
    markSeen: db.transaction((monitorId, itemIds) => {
      const now = Date.now();
      for (const id of itemIds) stmts.markSeen.run(monitorId, id, now);
    }),
    clearSeen(monitorId) {
      db.prepare('DELETE FROM seen_items WHERE monitor_id = ?').run(monitorId);
    },

    // ---- found items ----
    /**
     * Records a match. Returns true if the item had never been found before
     * (i.e. it deserves a notification), false if another monitor already found it.
     */
    recordFound: db.transaction((item, monitorId) => {
      const existed = !!stmts.getFound.get(item.item_id);
      if (!existed) stmts.insertFound.run({ ...item, found_at: Date.now() });
      stmts.linkFound.run(item.item_id, monitorId);
      return !existed;
    }),
    setNotified(itemId, value) {
      stmts.setNotified.run(value ? 1 : 0, itemId);
    },
    listFound({ monitorId = null, limit = 50, before = null } = {}) {
      const where = [];
      const params = {};
      if (monitorId) {
        where.push('f.item_id IN (SELECT item_id FROM found_item_monitors WHERE monitor_id = @monitorId)');
        params.monitorId = monitorId;
      }
      if (before) {
        where.push('f.found_at < @before');
        params.before = before;
      }
      params.limit = Math.min(Math.max(limit, 1), 200);
      const rows = db
        .prepare(
          `SELECT f.*, (SELECT json_group_array(json_object('id', m.id, 'name', m.name))
                          FROM found_item_monitors fm JOIN monitors m ON m.id = fm.monitor_id
                         WHERE fm.item_id = f.item_id) AS monitors
             FROM found_items f
             ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
            ORDER BY f.found_at DESC
            LIMIT @limit`,
        )
        .all(params);
      return rows.map((r) => ({ ...r, notified: !!r.notified, monitors: JSON.parse(r.monitors || '[]') }));
    },

    // ---- settings ----
    getSettings() {
      const out = { ...SETTING_DEFAULTS };
      for (const key of Object.keys(SETTING_DEFAULTS)) {
        const row = stmts.getSetting.get(key);
        if (row) {
          try {
            out[key] = JSON.parse(row.value);
          } catch {
            /* keep default */
          }
        }
      }
      return out;
    },
    setSettings(values) {
      db.transaction(() => {
        for (const [k, v] of Object.entries(values)) {
          if (!(k in SETTING_DEFAULTS)) continue;
          stmts.setSetting.run(k, JSON.stringify(v));
        }
      })();
      return store.getSettings();
    },

    // ---- push subscriptions ----
    listSubscriptions() {
      return stmts.listSubs.all();
    },
    saveSubscription(sub, userAgent = '') {
      stmts.upsertSub.run(sub.endpoint, sub.keys.p256dh, sub.keys.auth, userAgent, Date.now());
    },
    deleteSubscriptionByEndpoint(endpoint) {
      return stmts.deleteSubByEndpoint.run(endpoint).changes > 0;
    },
    deleteSubscription(id) {
      stmts.deleteSubById.run(id);
    },
    markSubscriptionOk(id) {
      stmts.subOk.run(Date.now(), id);
    },

    // ---- housekeeping ----
    prune({ seenDays = 30, foundDays = 60 } = {}) {
      const day = 24 * 3600 * 1000;
      stmts.pruneSeen.run(Date.now() - seenDays * day);
      stmts.pruneFound.run(Date.now() - foundDays * day);
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    },

    counts() {
      return {
        monitors: db.prepare('SELECT COUNT(*) AS n FROM monitors').get().n,
        activeMonitors: db.prepare('SELECT COUNT(*) AS n FROM monitors WHERE enabled = 1').get().n,
        found: db.prepare('SELECT COUNT(*) AS n FROM found_items').get().n,
        found24h: db
          .prepare('SELECT COUNT(*) AS n FROM found_items WHERE found_at > ?')
          .get(Date.now() - 24 * 3600 * 1000).n,
        seen: db.prepare('SELECT COUNT(*) AS n FROM seen_items').get().n,
        subscriptions: db.prepare('SELECT COUNT(*) AS n FROM push_subscriptions').get().n,
      };
    },
  };

  return store;
}

module.exports = { createStore, SETTING_DEFAULTS };
