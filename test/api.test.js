'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/server');
const { FAKE_TOKEN, fakeTelegram } = require('./helpers');

function start({ telegram = true } = {}) {
  const tg = fakeTelegram();
  const cfg = {
    appPassword: 'secreto',
    timezone: 'Europe/Madrid',
    trustProxy: true,
    vinted: { domain: 'www.vinted.es', pollIntervalSeconds: 45, userAgent: 't', minRequestGapMs: 0 },
    telegram: telegram ? { token: FAKE_TOKEN, chatId: '42' } : { token: '', chatId: '' },
  };
  const ctx = createApp({
    cfg,
    db: openDatabase(':memory:'),
    fetchImpl: async () => {
      throw new Error('no network in tests');
    },
    telegramFetch: tg.fetchImpl,
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
      resolve({ ctx, server, call, tg });
    });
  });
}

test('login, monitor CRUD, URL parsing, settings, Telegram test', async (t) => {
  const { ctx, server, call, tg } = await start();
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

  // Telegram test alert: no finds yet -> text-only sample with the button.
  const testRes = await call('/api/telegram/test', { method: 'POST' });
  assert.equal(testRes.status, 200);
  assert.deepEqual(testRes.body, { mode: 'text', usedRealItem: false });
  const [msg] = tg.sent();
  assert.equal(msg.method, 'sendMessage');
  assert.equal(msg.body.chat_id, '42');
  assert.match(msg.body.text, /PRUEBA/);
  assert.equal(msg.body.reply_markup.inline_keyboard[0][0].text, 'Ver en Vinted');

  // Old push endpoints are gone.
  assert.equal((await call('/api/push/test', { method: 'POST' })).status, 404);

  // Settings
  const s = await call('/api/settings', {
    method: 'PUT',
    body: { quiet_enabled: true, quiet_start: '00:00', quiet_end: '08:00', poll_interval_seconds: 60 },
  });
  assert.equal(s.status, 200);
  assert.equal(s.body.poll_interval_seconds, 60);
  assert.equal('quiet_summary' in s.body, false);
  assert.equal((await call('/api/settings', { method: 'PUT', body: { quiet_start: '25:00' } })).status, 400);

  const status = await call('/api/status');
  assert.equal(status.status, 200);
  assert.equal(status.body.telegram.configured, true);
  assert.equal(JSON.stringify(status.body).includes(FAKE_TOKEN), false, 'token never exposed');

  const logs = await call('/api/logs');
  assert.ok(Array.isArray(logs.body));

  await call('/api/logout', { method: 'POST' });
  assert.equal((await call('/api/monitors')).status, 401);
});

test('Telegram test endpoint explains missing configuration', async (t) => {
  const { ctx, server, call } = await start({ telegram: false });
  t.after(() => server.close());
  await call('/api/login', { method: 'POST', body: { password: 'secreto' } });
  const r = await call('/api/telegram/test', { method: 'POST' });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /TELEGRAM_BOT_TOKEN/);
  assert.equal(ctx.bot, null);
});
