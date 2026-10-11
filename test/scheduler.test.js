'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Scheduler } = require('../src/monitor/scheduler');
const { VintedError, normalizeItem } = require('../src/vinted/client');
const { makeDb, rawItem } = require('./helpers');

function setup({ settings = {} } = {}) {
  const { db, store, logger } = makeDb();
  store.setSettings(settings);
  const results = { items: [], error: null, descriptions: {} };
  const client = {
    blockedUntil: 0,
    lastBlockStatus: 0,
    isBlocked() {
      return this.blockedUntil > Date.now();
    },
    async search() {
      if (results.error) throw results.error;
      return results.items.map((it) => normalizeItem(it, 'https://www.vinted.es'));
    },
    async getDescription(id) {
      return results.descriptions[id] ?? null;
    },
  };
  const notified = [];
  const notifier = {
    async notifyItem(item, monitorName) {
      notified.push({ id: item.id, monitorName });
      return true;
    },
  };
  const scheduler = new Scheduler({ store, client, notifier, logger, defaultIntervalSeconds: 45, random: () => 0.5 });
  return { db, store, client, notifier, scheduler, results, notified };
}

const monitorData = (extra = {}) => ({
  name: 'Dunks',
  search_text: 'dunk',
  kind: 'custom',
  catalog_ids: [1242],
  brand_ids: [],
  size_ids: [],
  status_ids: [],
  extra_params: {},
  price_to: 100,
  price_from: null,
  exclude_words: [],
  check_description: false,
  enabled: true,
  ...extra,
});

test('first pass marks existing items as seen without notifying; later passes notify only new ones', async () => {
  const { store, scheduler, results, notified } = setup();
  const m = store.createMonitor(monitorData());

  results.items = [rawItem(3), rawItem(2), rawItem(1)];
  const delay = await scheduler.check(m.id);
  assert.ok(delay >= 36_000 && delay <= 54_000, `delay ${delay} within ±20 %`);
  assert.equal(notified.length, 0);
  assert.equal(store.getMonitor(m.id).primed, true);
  assert.equal(store.getMonitor(m.id).status, 'ok');

  results.items = [rawItem(5), rawItem(4), rawItem(3), rawItem(2), rawItem(1)];
  await scheduler.check(m.id);
  assert.deepEqual(notified.map((n) => n.id), [4, 5], 'oldest first');

  // Same results again: nothing new.
  await scheduler.check(m.id);
  assert.equal(notified.length, 2);
  assert.equal(store.listFound().length, 2);
});

test('local filters: price and excluded words in title and description', async () => {
  const { store, scheduler, results, notified } = setup();
  const m = store.createMonitor(monitorData({ price_from: 20, exclude_words: ['fake', 'caja'], check_description: true }));
  results.items = [];
  await scheduler.check(m.id);

  results.items = [
    rawItem(10, { price: { amount: '10.0', currency_code: 'EUR' } }), // too cheap
    rawItem(11, { title: 'Dunk FAKE' }),
    rawItem(12),
    rawItem(13),
  ];
  results.descriptions = { 13: 'Vendo solo la caja' };
  await scheduler.check(m.id);
  assert.deepEqual(notified.map((n) => n.id), [12]);
});

test('an item matched by two monitors is notified only once', async () => {
  const { store, scheduler, results, notified } = setup();
  const a = store.createMonitor(monitorData({ name: 'A' }));
  const b = store.createMonitor(monitorData({ name: 'B' }));
  results.items = [];
  await scheduler.check(a.id);
  await scheduler.check(b.id);
  results.items = [rawItem(20)];
  await scheduler.check(a.id);
  await scheduler.check(b.id);
  assert.equal(notified.length, 1);
  const found = store.listFound();
  assert.deepEqual(found[0].monitors.map((x) => x.name).sort(), ['A', 'B']);
  assert.equal(store.listFound({ monitorId: b.id }).length, 1);
});

test('rate limiting marks the monitor as limited; other errors back off exponentially', async () => {
  const { store, scheduler, results } = setup();
  const m = store.createMonitor(monitorData());

  results.error = new VintedError('Vinted respondió 429', { status: 429, retryAfterMs: 60_000, kind: 'limited' });
  const d1 = await scheduler.check(m.id);
  assert.equal(store.getMonitor(m.id).status, 'limited');
  assert.ok(d1 >= 60_000);

  results.error = new VintedError('Vinted respondió 500', { status: 500 });
  const e1 = await scheduler.check(m.id);
  const e2 = await scheduler.check(m.id);
  const e3 = await scheduler.check(m.id);
  assert.equal(store.getMonitor(m.id).status, 'error');
  assert.deepEqual([e1, e2, e3], [45_000, 90_000, 180_000]);

  results.error = null;
  await scheduler.check(m.id);
  assert.equal(store.getMonitor(m.id).status, 'ok');
  assert.equal(store.getMonitor(m.id).failures, 0);
});

test('items older than max_item_age_hours are ignored', async () => {
  const { store, scheduler, results, notified } = setup({ settings: { max_item_age_hours: 24 } });
  const m = store.createMonitor(monitorData());
  results.items = [];
  await scheduler.check(m.id);
  const old = rawItem(30);
  old.photo.high_resolution.timestamp = Math.floor(Date.now() / 1000) - 3 * 86400;
  results.items = [old, rawItem(31)];
  await scheduler.check(m.id);
  assert.deepEqual(notified.map((n) => n.id), [31]);
});

test('start() spreads monitors over the interval', () => {
  const { store, scheduler } = setup();
  for (let i = 0; i < 3; i++) store.createMonitor(monitorData({ name: `M${i}` }));
  const before = Date.now();
  scheduler.start();
  const next = Object.values(scheduler.status().nextRunAt).map((t) => t - before).sort((a, b) => a - b);
  scheduler.stop();
  assert.equal(next.length, 3);
  assert.ok(next[1] - next[0] >= 14_000, 'second monitor ~1/3 interval later');
  assert.ok(next[2] - next[1] >= 14_000, 'third monitor ~2/3 interval later');
});
