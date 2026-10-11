'use strict';

const { checkItem, findExcludedWord } = require('./filters');

const MAX_ERROR_BACKOFF_MS = 10 * 60_000;

/**
 * Polls every enabled monitor on its own timer:
 *  - interval ± 20 % random jitter,
 *  - start times spread over the interval so monitors do not fire together,
 *  - global pause while Vinted rate-limits us (403/429),
 *  - exponential backoff per monitor on other errors.
 */
class Scheduler {
  constructor({
    store, client, notifier, logger, defaultIntervalSeconds,
    random = Math.random, now = Date.now, timers = { setTimeout, clearTimeout, setInterval, clearInterval },
  }) {
    this.store = store;
    this.client = client;
    this.notifier = notifier;
    this.logger = logger;
    this.defaultIntervalSeconds = defaultIntervalSeconds;
    this.random = random;
    this.now = now;
    this.timers = timers;

    this.handles = new Map(); // monitorId -> timeout handle
    this.nextRunAt = new Map(); // monitorId -> timestamp
    this.running = new Map(); // monitorId -> promise
    this.housekeeping = [];
    this.started = false;
  }

  intervalMs() {
    const s = this.store.getSettings().poll_interval_seconds || this.defaultIntervalSeconds;
    return Math.max(10, Number(s)) * 1000;
  }

  jittered(ms) {
    return Math.round(ms * (0.8 + 0.4 * this.random()));
  }

  start() {
    if (this.started) return;
    this.started = true;
    const monitors = this.store.listMonitors().filter((m) => m.enabled);
    const interval = this.intervalMs();
    monitors.forEach((m, i) => {
      // Spread first runs across one interval.
      const offset = Math.round((i / Math.max(monitors.length, 1)) * interval) + Math.round(this.random() * 3000) + 2000;
      this.schedule(m.id, offset);
    });
    this.logger.info('monitor', `Monitor iniciado: ${monitors.length} búsquedas activas, intervalo ${interval / 1000} s`);

    this.housekeeping.push(
      this.timers.setInterval(() => {
        try {
          this.store.prune();
        } catch (err) {
          this.logger.error('db', err);
        }
      }, 6 * 3600_000),
    );
    for (const h of this.housekeeping) h.unref?.();
  }

  stop() {
    this.started = false;
    for (const h of this.handles.values()) this.timers.clearTimeout(h);
    for (const h of this.housekeeping) this.timers.clearInterval(h);
    this.handles.clear();
    this.nextRunAt.clear();
    this.housekeeping = [];
  }

  schedule(id, delayMs) {
    this.unschedule(id);
    if (!this.started) return;
    const handle = this.timers.setTimeout(() => {
      this.handles.delete(id);
      this.nextRunAt.delete(id);
      this.run(id);
    }, delayMs);
    handle.unref?.();
    this.handles.set(id, handle);
    this.nextRunAt.set(id, this.now() + delayMs);
  }

  unschedule(id) {
    const h = this.handles.get(id);
    if (h) this.timers.clearTimeout(h);
    this.handles.delete(id);
    this.nextRunAt.delete(id);
  }

  /** Call after a monitor is created, edited, paused, resumed or deleted. */
  sync(id) {
    const m = this.store.getMonitor(id);
    if (!m) {
      this.unschedule(id);
      return;
    }
    if (!m.enabled) {
      this.unschedule(id);
      this.store.patchMonitorState(id, { status: 'paused', status_message: 'Pausado' });
      return;
    }
    // Run soon, with a little randomness so bulk edits do not fire together.
    this.schedule(id, 1500 + Math.round(this.random() * 3000));
  }

  /** Re-spreads every active monitor over the (possibly new) interval. */
  rescheduleAll() {
    const active = this.store.listMonitors().filter((m) => m.enabled);
    const interval = this.intervalMs();
    active.forEach((m, i) => this.schedule(m.id, Math.round((i / active.length) * interval) + 2000));
  }

  /** Runs a monitor now and waits for the result. */
  async runNow(id) {
    this.unschedule(id);
    await this.run(id);
    return this.store.getMonitor(id);
  }

  run(id) {
    if (this.running.has(id)) return this.running.get(id);
    const p = this.check(id)
      .then((nextDelay) => {
        if (nextDelay != null) this.schedule(id, nextDelay);
      })
      .catch((err) => {
        this.logger.error('monitor', `Fallo inesperado: ${err.stack || err.message}`, id);
        this.schedule(id, this.jittered(this.intervalMs()));
      })
      .finally(() => this.running.delete(id));
    this.running.set(id, p);
    return p;
  }

  /** One polling pass. Returns the delay until the next pass, or null to stop. */
  async check(id) {
    const m = this.store.getMonitor(id);
    if (!m || !m.enabled) return null;
    const interval = this.intervalMs();
    const startedAt = this.now();

    // Vinted is rate-limiting us: wait until the global pause ends.
    if (this.client.isBlocked()) {
      const wait = this.client.blockedUntil - startedAt;
      this.store.patchMonitorState(id, {
        status: 'limited',
        status_message: `Vinted nos limita (HTTP ${this.client.lastBlockStatus}); reintento en ${Math.ceil(wait / 1000)} s`,
      });
      return wait + Math.round(this.random() * interval);
    }

    let items;
    try {
      items = await this.client.search(m);
    } catch (err) {
      const current = this.store.getMonitor(id);
      if (!current) return null;
      if (err.kind === 'limited') {
        this.store.patchMonitorState(id, { status: 'limited', status_message: err.message, last_check_at: startedAt });
        this.logger.warn('vinted', err.message, id);
        return (err.retryAfterMs || interval) + Math.round(this.random() * interval);
      }
      const failures = current.failures + 1;
      this.store.patchMonitorState(id, {
        status: 'error',
        status_message: err.message,
        last_check_at: startedAt,
        failures,
      });
      this.logger.error('monitor', `${m.name}: ${err.message}`, id);
      return Math.min(interval * 2 ** (failures - 1), MAX_ERROR_BACKOFF_MS);
    }

    // The monitor may have been edited or deleted while we were waiting for Vinted.
    const current = this.store.getMonitor(id);
    if (!current || current.updated_at !== m.updated_at) return current && current.enabled ? 1000 : null;

    const fresh = items.filter((it) => !this.store.isSeen(id, it.id));
    // Mark everything as seen *before* notifying, so a crash can never cause a duplicate.
    this.store.markSeen(id, items.map((it) => it.id));

    if (!m.primed) {
      this.store.patchMonitorState(id, {
        primed: true,
        status: 'ok',
        status_message: `Primera pasada: ${items.length} artículos existentes marcados como vistos`,
        last_check_at: startedAt,
        last_success_at: this.now(),
        failures: 0,
      });
      this.logger.info('monitor', `${m.name}: primera pasada, ${items.length} artículos marcados como vistos`, id);
      return this.jittered(interval);
    }

    const maxAgeHours = Number(this.store.getSettings().max_item_age_hours) || 0;
    let matched = 0;
    // Oldest first, so notifications arrive in publication order.
    for (const item of [...fresh].reverse()) {
      const verdict = checkItem(item, m, { maxAgeHours, now: this.now() });
      if (!verdict.ok) continue;
      if (m.check_description && m.exclude_words.length) {
        let description = item.description;
        if (description == null) {
          try {
            description = await this.client.getDescription(item.id);
          } catch (err) {
            this.logger.warn('monitor', `No se pudo leer la descripción de ${item.id}: ${err.message}`, id);
          }
        }
        if (description && findExcludedWord(description, m.exclude_words)) continue;
      }
      matched++;
      await this.handleMatch(item, m);
    }

    this.store.patchMonitorState(id, {
      status: 'ok',
      status_message: `${items.length} resultados · ${fresh.length} nuevos · ${matched} coinciden`,
      last_check_at: startedAt,
      last_success_at: this.now(),
      failures: 0,
    });
    return this.jittered(interval);
  }

  async handleMatch(item, monitor) {
    const isNew = this.store.recordFound(
      {
        item_id: item.id,
        title: item.title,
        brand: item.brand,
        size: item.size,
        condition: item.condition,
        price: item.price,
        total_price: item.totalPrice,
        currency: item.currency,
        photo_url: item.photoUrl,
        url: item.url,
        published_at: item.publishedAt,
      },
      monitor.id,
    );
    if (!isNew) return; // another monitor already notified this item
    this.logger.info('monitor', `${monitor.name}: nuevo artículo ${item.id} "${item.title}" ${item.price} ${item.currency}`, monitor.id);
    try {
      const sent = await this.notifier.notifyItem(item, monitor.name);
      this.store.setNotified(item.id, sent);
    } catch (err) {
      this.logger.error('telegram', err, monitor.id);
    }
  }

  status() {
    const out = {};
    for (const [id, at] of this.nextRunAt) out[id] = at;
    return { started: this.started, nextRunAt: out, running: [...this.running.keys()] };
  }
}

module.exports = { Scheduler };
