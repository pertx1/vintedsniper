'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTelegramApi } = require('../src/telegram/api');
const { createNotifier, formatCaption } = require('../src/telegram/notifier');
const { TelegramBot } = require('../src/telegram/bot');
const { createMonitorActions } = require('../src/monitor/actions');
const { makeDb, fakeTelegram, FAKE_TOKEN } = require('./helpers');

// 2026-01-15 12:00 in Madrid (UTC+1)
const NOON = Date.parse('2026-01-15T11:00:00Z');

const ITEM = {
  id: 99,
  title: 'Dunk Low <Panda> & co',
  brand: 'Nike',
  size: '42',
  condition: 'Muy bueno',
  price: 45,
  totalPrice: 48.05,
  currency: 'EUR',
  photoUrl: 'https://images.vinted.net/99.jpg',
  url: 'https://www.vinted.es/items/99-dunk',
  publishedAt: NOON - 120_000,
};

function setup({ handlers, settings = {} } = {}) {
  const { db, store, logger } = makeDb();
  store.setSettings(settings);
  const tg = fakeTelegram(handlers);
  const sleeps = [];
  const api = createTelegramApi({
    token: FAKE_TOKEN,
    fetchImpl: tg.fetchImpl,
    minSendGapMs: 0,
    sleep: async (ms) => sleeps.push(ms),
  });
  const notifier = createNotifier({ store, logger, api, chatId: '42', timezone: 'Europe/Madrid', now: () => NOON });
  const logs = () => db.prepare('SELECT level, message FROM logs ORDER BY id').all();
  return { db, store, logger, tg, api, notifier, sleeps, logs };
}

test('caption has brand, title, price, size, condition and monitor, HTML-escaped', () => {
  const c = formatCaption(ITEM, 'Dunks <baratas>', { now: NOON });
  assert.match(c, /<b>Nike · Dunk Low &lt;Panda&gt; &amp; co<\/b>/);
  assert.match(c, /45,00\s€ \(48,05\s€ con protección\)/);
  assert.match(c, /Talla 42/);
  assert.match(c, /Muy bueno/);
  assert.match(c, /🎯 Dunks &lt;baratas&gt;/);
  assert.match(c, /publicado hace 2 min/);
  assert.ok(c.length <= 1024);
  assert.ok(formatCaption({ ...ITEM, title: 'x'.repeat(5000) }, 'M').length <= 1024);
});

test('sends the photo with caption and a "Ver en Vinted" button', async () => {
  const { tg, notifier } = setup();
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), true);
  const [call] = tg.sent();
  assert.equal(call.method, 'sendPhoto');
  assert.equal(call.body.chat_id, '42');
  assert.equal(call.body.photo, ITEM.photoUrl);
  assert.equal(call.body.parse_mode, 'HTML');
  assert.equal(call.body.disable_notification, false);
  assert.deepEqual(call.body.reply_markup, { inline_keyboard: [[{ text: 'Ver en Vinted', url: ITEM.url }]] });
});

test('falls back to a text message when the photo fails', async () => {
  const { tg, notifier, logs } = setup({
    handlers: { sendPhoto: { error_code: 400, description: 'Bad Request: wrong file identifier/HTTP URL specified' } },
  });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), true);
  const sent = tg.sent();
  assert.deepEqual(sent.map((c) => c.method), ['sendPhoto', 'sendMessage']);
  assert.match(sent[1].body.text, /Nike · Dunk Low/);
  assert.equal(sent[1].body.reply_markup.inline_keyboard[0][0].url, ITEM.url);
  assert.ok(logs().some((l) => l.level === 'warn' && /solo texto/.test(l.message)));
});

test('items without photo go straight to text', async () => {
  const { tg, notifier } = setup();
  await notifier.notifyItem({ ...ITEM, photoUrl: '' }, 'Dunks');
  assert.deepEqual(tg.sent().map((c) => c.method), ['sendMessage']);
});

test('429: waits the retry_after Telegram asks for, then retries', async () => {
  let attempts = 0;
  const { tg, notifier, sleeps } = setup({
    handlers: {
      sendPhoto: () => (++attempts < 3 ? { error_code: 429, description: 'Too Many Requests: retry after 7', parameters: { retry_after: 7 } } : undefined),
    },
  });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), true);
  assert.equal(attempts, 3);
  assert.deepEqual(sleeps, [7000, 7000]);
  assert.deepEqual(tg.sent().map((c) => c.method), ['sendPhoto', 'sendPhoto', 'sendPhoto']);
});

test('429 that never clears: gives up after the retries, no text fallback', async () => {
  const { tg, notifier } = setup({
    handlers: { sendPhoto: { error_code: 429, description: 'Too Many Requests', parameters: { retry_after: 1 } } },
  });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), false);
  assert.equal(tg.sent().length, 4); // 1 + 3 retries
  assert.ok(tg.sent().every((c) => c.method === 'sendPhoto'));
});

test('quiet hours send silently instead of holding the alert back', async () => {
  const { tg, notifier } = setup({ settings: { quiet_enabled: true, quiet_start: '11:00', quiet_end: '13:00' } });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), true);
  assert.equal(tg.sent()[0].body.disable_notification, true);
});

test('the general switch disables alerts', async () => {
  const { tg, notifier } = setup({ settings: { notifications_enabled: false } });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), false);
  assert.equal(tg.sent().length, 0);
});

test('the bot token never reaches the logs', async () => {
  const { db, store, logger } = makeDb();
  const api = createTelegramApi({
    token: FAKE_TOKEN,
    minSendGapMs: 0,
    fetchImpl: async (url) => {
      throw new Error(`connect ECONNREFUSED while fetching ${url}`);
    },
  });
  const notifier = createNotifier({ store, logger, api, chatId: '42', timezone: 'Europe/Madrid' });
  assert.equal(await notifier.notifyItem(ITEM, 'Dunks'), false);
  const all = JSON.stringify(db.prepare('SELECT * FROM logs').all());
  assert.match(all, /ECONNREFUSED/);
  assert.equal(all.includes(FAKE_TOKEN), false);
  assert.match(all, /bot\*\*\*/);
  assert.equal(JSON.stringify(notifier.status()).includes(FAKE_TOKEN), false);
});

// ---------------------------------------------------------------- bot

function botSetup() {
  const ctx = setup();
  const synced = [];
  const scheduler = { sync: (id) => synced.push(id) };
  const actions = createMonitorActions({ store: ctx.store, scheduler });
  const client = { status: () => ({ blocked: false }) };
  const bot = new TelegramBot({
    api: ctx.api,
    chatId: '42',
    store: ctx.store,
    client,
    notifier: ctx.notifier,
    actions,
    logger: ctx.logger,
    timezone: 'Europe/Madrid',
    now: () => NOON,
  });
  bot.username = 'sniper_test_bot';
  let updateId = 1;
  const say = async (text, chatId = 42, { date = NOON / 1000 } = {}) => {
    const before = ctx.tg.sent().length;
    await bot.handleUpdate({ update_id: updateId++, message: { chat: { id: chatId }, date, text } });
    return ctx.tg.sent().slice(before).map((c) => c.body.text || c.body.caption);
  };
  const monitor = (name, extra = {}) =>
    ctx.store.createMonitor({
      name, search_text: name, kind: 'custom', catalog_ids: [], brand_ids: [], size_ids: [], status_ids: [],
      extra_params: {}, price_to: 80, price_from: null, exclude_words: [], check_description: false, enabled: true, ...extra,
    });
  return { ...ctx, bot, say, monitor, synced };
}

test('the bot ignores every chat except the configured one', async () => {
  const { say, monitor, store, logs } = botSetup();
  const m = monitor('Dunks');
  assert.deepEqual(await say('/pausartodo', 777), []);
  assert.equal(store.getMonitor(m.id).enabled, true);
  assert.ok(logs().some((l) => /otro chat \(777\)/.test(l.message)));
});

test('/monitores and /estado', async () => {
  const { say, monitor, store } = botSetup();
  const a = monitor('Dunks baratas', { price_from: 20 });
  monitor('Chaquetas', { enabled: false });
  store.patchMonitorState(a.id, { status: 'ok', last_check_at: NOON - 30_000 });

  const [list] = await say('/monitores');
  assert.match(list, /Dunks baratas<\/b> — 20,00\s€ – 80,00\s€/);
  assert.match(list, /Chaquetas<\/b> — máx\. 80,00\s€ · ⏸ pausado/);

  const [status] = await say('/estado');
  assert.match(status, /Vinted: ✅ normal/);
  assert.match(status, /🟢 <b>Dunks baratas<\/b> — OK · 11:59:30/);
  assert.match(status, /⏸ <b>Chaquetas<\/b> — pausado · —/);
});

test('/pausar and /reanudar by name, accent and case-insensitive', async () => {
  const { say, monitor, store, synced } = botSetup();
  const m = monitor('Camisetas Básicas');
  store.patchMonitorState(m.id, { primed: true });

  const [r1] = await say('/pausar camisetas basicas');
  assert.match(r1, /pausado/);
  assert.equal(store.getMonitor(m.id).enabled, false);

  const [r2] = await say('/reanudar@sniper_test_bot camis');
  assert.match(r2, /reanudado/);
  const after = store.getMonitor(m.id);
  assert.equal(after.enabled, true);
  assert.equal(after.primed, false, 'resume does a silent first pass');
  assert.deepEqual(synced, [m.id, m.id]);
});

test('/pausar with an ambiguous name changes nothing and lists the options', async () => {
  const { say, monitor, store } = botSetup();
  const a = monitor('Jordan 1');
  const b = monitor('Jordan 4');
  const [r] = await say('/pausar jordan');
  assert.match(r, /varios monitores/);
  assert.match(r, new RegExp(`#${a.id} Jordan 1`));
  assert.equal(store.getMonitor(a.id).enabled, true);
  assert.equal(store.getMonitor(b.id).enabled, true);
  const [byId] = await say(`/pausar ${b.id}`);
  assert.match(byId, /Jordan 4/);
  assert.equal(store.getMonitor(b.id).enabled, false);
  const [none] = await say('/pausar adidas');
  assert.match(none, /No hay ningún monitor/);
});

test('/pausartodo and /reanudartodo', async () => {
  const { say, monitor, store } = botSetup();
  monitor('A');
  monitor('B');
  monitor('C', { enabled: false });
  const [r1] = await say('/pausartodo');
  assert.match(r1, /Pausados 2: A, B/);
  assert.ok(store.listMonitors().every((m) => !m.enabled));
  const [r2] = await say('/reanudartodo');
  assert.match(r2, /Reanudados 3/);
  assert.ok(store.listMonitors().every((m) => m.enabled));
});

test('/test sends a test alert; unknown commands, other bots and stale messages', async () => {
  const { say, tg } = botSetup();
  const out = await say('/test');
  assert.match(out[0], /PRUEBA/);
  assert.match(out[1], /ejemplo solo con texto/);
  assert.equal(tg.sent()[0].body.reply_markup.inline_keyboard[0][0].text, 'Ver en Vinted');

  const [unknown] = await say('/comprar');
  assert.match(unknown, /Comando no reconocido/);
  assert.deepEqual(await say('/estado@otro_bot'), []);
  assert.deepEqual(await say('/estado', 42, { date: NOON / 1000 - 3600 }), []);
});

test('polling loop: registers commands, processes updates once and stores the offset', async () => {
  const { store, logger } = setup();
  let polls = 0;
  let bot;
  const handlers = {
    getUpdates: (body) => {
      polls++;
      if (polls === 1) {
        assert.equal(body.offset, 0);
        return [{ update_id: 500, message: { chat: { id: 42 }, date: Math.floor(Date.now() / 1000), text: '/ayuda' } }];
      }
      assert.equal(body.offset, 501);
      bot.stop();
      return [];
    },
  };
  const tg2 = fakeTelegram(handlers);
  const api2 = createTelegramApi({ token: FAKE_TOKEN, fetchImpl: tg2.fetchImpl, minSendGapMs: 0 });
  const notifier2 = createNotifier({ store, logger, api: api2, chatId: '42', timezone: 'Europe/Madrid' });
  bot = new TelegramBot({
    api: api2, chatId: '42', store, client: { status: () => ({}) }, notifier: notifier2,
    actions: createMonitorActions({ store, scheduler: { sync() {} } }), logger, timezone: 'Europe/Madrid',
  });
  await bot.start();
  while (bot.running) await new Promise((r) => setTimeout(r, 5));
  const methods = tg2.calls.map((c) => c.method);
  assert.deepEqual(methods.slice(0, 3), ['deleteWebhook', 'getMe', 'setMyCommands']);
  assert.ok(methods.includes('sendMessage'), 'answered /ayuda');
  assert.equal(store.getValue('telegram_offset'), 501);
  assert.equal(bot.status().username, 'sniper_test_bot');
});

test('migration removes the old Web Push data', () => {
  const { db } = makeDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  assert.equal(tables.includes('push_subscriptions'), false);
  assert.equal(db.pragma('user_version', { simple: true }), 2);
});
