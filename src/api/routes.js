'use strict';

const express = require('express');
const { parseVintedUrl } = require('../vinted/url-parser');
const { CATALOGS, CONDITIONS, resolveCatalogIds } = require('../vinted/catalogs');
const { toMinutes } = require('../push/quiet-hours');

const KINDS = ['sneakers', 'shoes', 'clothing', 'custom'];
const GENDERS = ['', 'men', 'women'];

function intList(v) {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(/[\s,;]+/);
  const out = [];
  for (const x of arr) {
    const n = Number.parseInt(x, 10);
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

function wordList(v) {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(/[\n,;]+/);
  return [...new Set(arr.map((w) => String(w).trim()).filter(Boolean))].slice(0, 100);
}

function optNumber(v) {
  if (v == null || v === '') return null;
  const n = Number.parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Validates and normalizes a monitor payload from the UI. */
function validateMonitor(body) {
  const errors = [];
  const b = body || {};
  const data = {};

  data.name = String(b.name || '').trim().slice(0, 80);
  if (!data.name) errors.push('El nombre es obligatorio');

  data.search_text = String(b.search_text || '').trim().slice(0, 200);
  data.kind = KINDS.includes(b.kind) ? b.kind : 'custom';
  data.gender = GENDERS.includes(b.gender) ? b.gender : '';
  data.subcategory = String(b.subcategory || '').slice(0, 40);
  data.catalog_ids = data.kind === 'custom'
    ? intList(b.catalog_ids)
    : resolveCatalogIds(data.kind, data.gender, data.subcategory);
  data.brand_ids = intList(b.brand_ids);
  data.size_ids = intList(b.size_ids);
  data.status_ids = intList(b.status_ids);
  data.extra_params = b.extra_params && typeof b.extra_params === 'object' && !Array.isArray(b.extra_params)
    ? b.extra_params
    : {};

  data.price_to = optNumber(b.price_to);
  if (data.price_to == null || Number.isNaN(data.price_to) || data.price_to <= 0) {
    errors.push('El precio máximo es obligatorio y debe ser mayor que 0');
  }
  data.price_from = optNumber(b.price_from);
  if (Number.isNaN(data.price_from) || data.price_from < 0) errors.push('El precio mínimo no es válido');
  else if (data.price_from != null && data.price_to > 0 && data.price_from >= data.price_to) {
    errors.push('El precio mínimo debe ser menor que el máximo');
  }

  data.exclude_words = wordList(b.exclude_words);
  data.check_description = !!b.check_description;
  data.source_url = String(b.source_url || '').slice(0, 2000);
  data.enabled = b.enabled === undefined ? true : !!b.enabled;

  if (!data.search_text && !data.catalog_ids.length && !data.brand_ids.length) {
    errors.push('Indica al menos un texto de búsqueda, una categoría o una marca');
  }
  return { data, errors };
}

function validateSettings(body) {
  const b = body || {};
  const out = {};
  const errors = [];
  if ('poll_interval_seconds' in b) {
    if (b.poll_interval_seconds === null || b.poll_interval_seconds === '') out.poll_interval_seconds = null;
    else {
      const n = Number.parseInt(b.poll_interval_seconds, 10);
      if (!Number.isFinite(n) || n < 15 || n > 3600) errors.push('El intervalo debe estar entre 15 y 3600 s');
      else out.poll_interval_seconds = n;
    }
  }
  for (const k of ['notifications_enabled', 'quiet_enabled', 'quiet_summary']) {
    if (k in b) out[k] = !!b[k];
  }
  for (const k of ['quiet_start', 'quiet_end']) {
    if (k in b) {
      if (toMinutes(b[k]) == null) errors.push(`Hora no válida: ${b[k]}`);
      else out[k] = b[k];
    }
  }
  if ('max_item_age_hours' in b) {
    const n = Number.parseInt(b.max_item_age_hours, 10);
    if (!Number.isFinite(n) || n < 0 || n > 24 * 30) errors.push('Antigüedad máxima no válida');
    else out.max_item_age_hours = n;
  }
  return { data: out, errors };
}

function createApiRouter({ store, db, auth, scheduler, client, push, config, startedAt = Date.now() }) {
  const r = express.Router();
  r.use(express.json({ limit: '100kb' }));

  // ---- public ----
  r.get('/health', (req, res) => res.json({ ok: true }));
  r.post('/login', auth.login);
  r.post('/logout', auth.logout);
  r.get('/me', (req, res) => res.json({ authenticated: auth.isAuthenticated(req) }));

  r.use(auth.requireAuth);

  const idParam = (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!store.getMonitor(id)) {
      res.status(404).json({ error: 'Monitor no encontrado' });
      return null;
    }
    return id;
  };

  // ---- reference data ----
  r.get('/catalogs', (req, res) => res.json({ catalogs: CATALOGS, conditions: CONDITIONS, domain: config.vinted.domain }));

  r.post('/parse-url', (req, res) => {
    try {
      const parsed = parseVintedUrl(req.body?.url);
      const warnings = [];
      if (parsed.domain !== config.vinted.domain) {
        warnings.push(`La URL es de ${parsed.domain} pero el monitor consulta ${config.vinted.domain}. Los IDs suelen coincidir, pero los resultados serán los de ${config.vinted.domain}.`);
      }
      if (parsed.price_to == null) warnings.push('La URL no tiene precio máximo: indícalo en el formulario.');
      res.json({ ...parsed, warnings });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ---- monitors ----
  r.get('/monitors', (req, res) => {
    const next = scheduler.status().nextRunAt;
    res.json(store.listMonitors().map((m) => ({ ...m, next_run_at: next[m.id] || null })));
  });

  r.post('/monitors', (req, res) => {
    const { data, errors } = validateMonitor(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });
    const m = store.createMonitor(data);
    scheduler.sync(m.id);
    res.status(201).json(store.getMonitor(m.id));
  });

  r.put('/monitors/:id', (req, res) => {
    const id = idParam(req, res);
    if (id == null) return;
    const { data, errors } = validateMonitor(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });
    store.updateMonitor(id, data);
    // New filters: the next pass only learns the current results, without notifying.
    store.patchMonitorState(id, { primed: false, failures: 0, status: data.enabled ? 'pending' : 'paused', status_message: '' });
    scheduler.sync(id);
    res.json(store.getMonitor(id));
  });

  r.post('/monitors/:id/toggle', (req, res) => {
    const id = idParam(req, res);
    if (id == null) return;
    const enabled = req.body?.enabled === undefined ? !store.getMonitor(id).enabled : !!req.body.enabled;
    store.updateMonitor(id, { enabled });
    if (enabled) store.patchMonitorState(id, { primed: false, failures: 0, status: 'pending', status_message: 'Reactivado' });
    scheduler.sync(id);
    res.json(store.getMonitor(id));
  });

  r.post('/monitors/:id/run', async (req, res) => {
    const id = idParam(req, res);
    if (id == null) return;
    if (!store.getMonitor(id).enabled) return res.status(400).json({ error: 'El monitor está pausado' });
    res.json(await scheduler.runNow(id));
  });

  r.delete('/monitors/:id', (req, res) => {
    const id = idParam(req, res);
    if (id == null) return;
    store.deleteMonitor(id);
    scheduler.sync(id);
    res.json({ ok: true });
  });

  // ---- found items ----
  r.get('/found', (req, res) => {
    const monitorId = Number.parseInt(req.query.monitor_id, 10) || null;
    const limit = Number.parseInt(req.query.limit, 10) || 50;
    const before = Number.parseInt(req.query.before, 10) || null;
    res.json(store.listFound({ monitorId, limit, before }));
  });

  // ---- push ----
  r.get('/push/public-key', (req, res) => res.json({ publicKey: push.publicKey || null, configured: push.configured }));

  r.post('/push/subscribe', (req, res) => {
    const sub = req.body?.subscription;
    if (!sub || typeof sub.endpoint !== 'string' || !sub.keys?.p256dh || !sub.keys?.auth) {
      return res.status(400).json({ error: 'Suscripción no válida' });
    }
    if (!/^https:\/\//.test(sub.endpoint)) return res.status(400).json({ error: 'Endpoint no válido' });
    store.saveSubscription(sub, String(req.headers['user-agent'] || '').slice(0, 300));
    res.json({ ok: true });
  });

  r.post('/push/unsubscribe', (req, res) => {
    const endpoint = req.body?.endpoint;
    if (typeof endpoint === 'string') store.deleteSubscriptionByEndpoint(endpoint);
    res.json({ ok: true });
  });

  r.post('/push/test', async (req, res) => {
    if (!push.configured) return res.status(400).json({ error: 'Faltan las claves VAPID en el servidor' });
    const result = await push.sendTest();
    if (!result.sent) {
      return res.status(400).json({ error: 'No hay ningún dispositivo suscrito que haya aceptado la notificación', ...result });
    }
    res.json(result);
  });

  // ---- settings & status ----
  r.get('/settings', (req, res) => {
    res.json({ ...store.getSettings(), default_poll_interval_seconds: config.vinted.pollIntervalSeconds, timezone: config.timezone });
  });

  r.put('/settings', (req, res) => {
    const { data, errors } = validateSettings(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join('. ') });
    const before = store.getSettings();
    const saved = store.setSettings(data);
    if ('poll_interval_seconds' in data && data.poll_interval_seconds !== before.poll_interval_seconds) {
      // Reschedule so the new interval applies right away, spread out again.
      const active = store.listMonitors().filter((m) => m.enabled);
      const interval = scheduler.intervalMs();
      active.forEach((m, i) => scheduler.schedule(m.id, Math.round((i / active.length) * interval) + 2000));
    }
    res.json({ ...saved, default_poll_interval_seconds: config.vinted.pollIntervalSeconds, timezone: config.timezone });
  });

  r.get('/status', (req, res) => {
    res.json({
      startedAt,
      now: Date.now(),
      version: require('../../package.json').version,
      vinted: client.status(),
      scheduler: scheduler.status(),
      push: { configured: push.configured },
      counts: store.counts(),
      intervalSeconds: scheduler.intervalMs() / 1000,
      timezone: config.timezone,
    });
  });

  r.get('/logs', (req, res) => {
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    const levels = level === 'warn' ? ['warn', 'error'] : level === 'error' ? ['error'] : ['info', 'warn', 'error'];
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 200, 1000);
    const rows = db
      .prepare(
        `SELECT l.*, m.name AS monitor_name FROM logs l LEFT JOIN monitors m ON m.id = l.monitor_id
          WHERE l.level IN (${levels.map(() => '?').join(',')}) ORDER BY l.id DESC LIMIT ?`,
      )
      .all(...levels, limit);
    res.json(rows);
  });

  r.delete('/logs', (req, res) => {
    db.prepare('DELETE FROM logs').run();
    res.json({ ok: true });
  });

  // Express 5 forwards rejected promises here.
  // eslint-disable-next-line no-unused-vars
  r.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return r;
}

module.exports = { createApiRouter, validateMonitor, validateSettings };
