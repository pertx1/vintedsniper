'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/server');

function start() {
  const sent = [];
  const pushSender = {
    setVapidDetails() {},
    async sendNotification(sub, body) {
      if (sub.endpoint.includes('gone')) {
        const err = new Error('Gone');
        err.statusCode = 410;
        throw err;
      }
      sent.push({ endpoint: sub.endpoint, payload: JSON.parse(body) });
    },
  };
  const cfg = {
    appPassword: 'secreto',
    timezone: 'Europe/Madrid',
    trustProxy: true,
    vinted: { domain: 'www.vinted.es', pollIntervalSeconds: 45, userAgent: 't', minRequestGapMs: 0 },
    vapid: { publicKey: 'BPub', privateKey: 'priv', subject: 'mailto:x@y.z' },
  };
  const ctx = createApp({
    cfg,
    db: openDatabase(':memory:'),
    fetchImpl: async () => {
      throw new Error('no network in tests');
    },
    pushSender,
    quietLogs: true,
  });
  return new Promise((resolve) => {
    const server = ctx.app.listen(0, '127.0.0.1', () => {
      const base = `http://127.0.0.1:${server.address().port}`;
      let cookie = '';
      async function call(path, { method = 'GET', body } = {}) {
        const res = await fetch(base + path, {
          method,
          headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        const set = res.headers.get('set-cookie');
        if (set) cookie = set.split(';')[0];
        return { status: res.status, body: await res.json().catch(() => null) };
      }
      resolve({ ctx, server, call, sent });
    });
  });
}

test('login, monitor CRUD, URL parsing, push subscriptions', async (t) => {
  const { ctx, server, call, sent } = await start();
  t.after(() => {
    ctx.scheduler.stop();
    server.close();
  });

  assert.equal((await call('/api/monitors')).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', body: { password: 'mal' } })).status, 401);
  assert.equal((await call('/api/login', { method: 'POST', body: { password: 'secreto' } })).status, 200);
  assert.equal((await call('/api/me')).body.authenticated, true);

  // Parse URL
  const parsed = await call('/api/parse-url', {
    method: 'POST',
    body: { url: 'https://www.vinted.es/catalog?catalog[]=1242&brand_ids[]=53&price_to=90&status_ids[]=6' },
  });
  assert.equal(parsed.status, 200);
  assert.deepEqual(parsed.body.catalog_ids, [1242]);

  // Validation
  const bad = await call('/api/monitors', { method: 'POST', body: { name: 'x', search_text: 'y' } });
  assert.equal(bad.status, 400);
  assert.match(bad.body.error, /precio máximo/);

  // Create from parsed URL
  const created = await call('/api/monitors', {
    method: 'POST',
    body: { name: 'Jordan', kind: 'custom', ...parsed.body, exclude_words: 'fake, réplica' },
  });
  assert.equal(created.status, 201);
  assert.deepEqual(created.body.brand_ids, [53]);
  assert.deepEqual(created.body.exclude_words, ['fake', 'réplica']);
  assert.equal(created.body.price_to, 90);

  // Manual kind -> catalog ids
  const manual = await call('/api/monitors', {
    method: 'POST',
    body: { name: 'Zapas', kind: 'sneakers', gender: 'men', price_to: 50, price_from: 10 },
  });
  assert.deepEqual(manual.body.catalog_ids, [1242]);

  const id = created.body.id;
  const paused = await call(`/api/monitors/${id}/toggle`, { method: 'POST', body: { enabled: false } });
  assert.equal(paused.body.enabled, false);
  assert.equal(paused.body.status, 'paused');
  const resumed = await call(`/api/monitors/${id}/toggle`, { method: 'POST', body: { enabled: true } });
  assert.equal(resumed.body.enabled, true);
  assert.equal(resumed.body.primed, false);

  assert.equal((await call('/api/monitors')).body.length, 2);
  assert.equal((await call(`/api/monitors/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await call('/api/monitors')).body.length, 1);

  // Push: subscribe a live and a dead endpoint, the dead one is cleaned up on send.
  for (const endpoint of ['https://push.example/live', 'https://push.example/gone']) {
    const r = await call('/api/push/subscribe', {
      method: 'POST',
      body: { subscription: { endpoint, keys: { p256dh: 'k', auth: 'a' } } },
    });
    assert.equal(r.status, 200);
  }
  const testPush = await call('/api/push/test', { method: 'POST' });
  assert.equal(testPush.status, 200);
  assert.equal(testPush.body.sent, 1);
  assert.equal(testPush.body.removed, 1);
  assert.equal(sent.length, 1);
  assert.equal(ctx.store.listSubscriptions().length, 1);

  // Settings
  const s = await call('/api/settings', {
    method: 'PUT',
    body: { quiet_enabled: true, quiet_start: '00:00', quiet_end: '08:00', poll_interval_seconds: 60 },
  });
  assert.equal(s.status, 200);
  assert.equal(s.body.poll_interval_seconds, 60);
  assert.equal((await call('/api/settings', { method: 'PUT', body: { quiet_start: '25:00' } })).status, 400);

  const status = await call('/api/status');
  assert.equal(status.status, 200);
  assert.equal(status.body.counts.subscriptions, 1);

  const logs = await call('/api/logs');
  assert.ok(Array.isArray(logs.body));

  await call('/api/logout', { method: 'POST' });
  assert.equal((await call('/api/monitors')).status, 401);
});

test('item notification payload', () => {
  const { createPush } = require('../src/push/push');
  const push = createPush({
    store: {},
    logger: {},
    vapid: {},
    timezone: 'Europe/Madrid',
    sender: { setVapidDetails() {} },
  });
  const p = push.itemPayload(
    { id: 1, title: 'Dunk Low', brand: 'Nike', price: 45, totalPrice: 48.05, currency: 'EUR', size: '42', condition: 'Muy bueno', url: 'https://www.vinted.es/items/1', photoUrl: 'https://img/1.jpg' },
    'Dunks',
  );
  assert.equal(p.title, 'Nike · Dunk Low');
  assert.match(p.body, /45,00\s€/);
  assert.match(p.body, /Talla 42/);
  assert.match(p.body, /Muy bueno/);
  assert.match(p.body, /\[Dunks\]/);
  assert.equal(p.url, 'https://www.vinted.es/items/1');
  assert.equal(p.image, 'https://img/1.jpg');
});
