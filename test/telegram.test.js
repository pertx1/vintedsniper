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
  const ran = [];
  let rescheduled = 0;
  const scheduler = {
    sync: (id) => synced.push(id),
    runNow: async (id) => {
      ran.push(id);
      ctx.store.patchMonitorState(id, { status: 'ok', last_check_at: NOON, status_message: '96 resultados · 0 nuevos' });
    },
    rescheduleAll: () => rescheduled++,
  };
  const actions = createMonitorActions({ store: ctx.store, scheduler });
  const client = { status: () => ({ blocked: false }) };
  const bot = new TelegramBot({
    api: ctx.api,
    chatId: '42',
    store: ctx.store,
    client,
    notifier: ctx.notifier,
    actions,
    scheduler,
    logger: ctx.logger,
    timezone: 'Europe/Madrid',
    domain: 'www.vinted.es',
    defaultIntervalSeconds: 45,
    now: () => NOON,
  });
  bot.username = 'sniper_test_bot';
  let updateId = 1;
  const outgoing = (before) =>
    ctx.tg.calls.slice(before).filter((c) => ['sendMessage', 'sendPhoto', 'editMessageText'].includes(c.method));
  const say = async (text, chatId = 42, { date = NOON / 1000 } = {}) => {
    const before = ctx.tg.calls.length;
    await bot.handleUpdate({ update_id: updateId++, message: { chat: { id: chatId }, date, text } });
    return outgoing(before).map((c) => c.body.text || c.body.caption);
  };
  /** Presses an inline button; returns the outgoing calls (with method) and the toast. */
  const press = async (data, { chatId = 42, messageId = 7 } = {}) => {
    const before = ctx.tg.calls.length;
    await bot.handleUpdate({
      update_id: updateId++,
      callback_query: { id: `cq${updateId}`, data, message: { message_id: messageId, chat: { id: chatId } } },
    });
    const calls = ctx.tg.calls.slice(before);
    const answer = calls.find((c) => c.method === 'answerCallbackQuery');
    return { out: outgoing(before), toast: answer?.body.text, answered: !!answer };
  };
  const lastMarkup = () => [...ctx.tg.calls].reverse().find((c) => c.body.reply_markup)?.body.reply_markup;
  const buttons = () => (lastMarkup()?.inline_keyboard || []).flat();
  const monitor = (name, extra = {}) =>
    ctx.store.createMonitor({
      name, search_text: name, kind: 'custom', catalog_ids: [], brand_ids: [], size_ids: [], status_ids: [],
      extra_params: {}, price_to: 80, price_from: null, exclude_words: [], check_description: false, enabled: true, ...extra,
    });
  return { ...ctx, bot, say, press, buttons, monitor, synced, ran, rescheduledCount: () => rescheduled };
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
    scheduler: { sync() {} },
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

test('migrations remove the old Web Push and web session tables', () => {
  const { db } = makeDb();
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name);
  assert.equal(tables.includes('push_subscriptions'), false);
  assert.equal(tables.includes('sessions'), false);
  assert.equal(db.pragma('user_version', { simple: true }), 3);
});

// ---------------------------------------------------------------- management from Telegram

const URL_WITH_PRICE =
  'https://www.vinted.es/catalog?search_text=jordan%201&catalog[]=1242&brand_ids[]=53&size_ids[]=785&status_ids[]=6&price_to=90&order=newest_first';

test('pasting a Vinted URL creates a monitor step by step', async () => {
  const { say, press, buttons, store, synced } = botSetup();

  const [intro] = await say(`mira esto ${URL_WITH_PRICE}`);
  assert.match(intro, /Nuevo monitor/);
  assert.match(intro, /Búsqueda: «jordan 1»/);
  assert.match(intro, /Marcas: 1/);
  assert.match(intro, /Nuevo con etiquetas/);
  assert.match(intro, /1\/4 · ¿Qué <b>nombre<\/b>/);
  assert.deepEqual(buttons().map((b) => b.callback_data), ['w:name:default']);

  // name: use the search text
  const r1 = await press('w:name:default');
  assert.match(r1.out[0].body.text, /Precio máximo/);
  assert.equal(buttons()[0].text, 'Usar 90,00 € (de la URL)');

  // max price: invalid, then typed
  const [bad] = await say('mucho');
  assert.match(bad, /Escribe un número mayor que 0/);
  const [minQ] = await say('85,5');
  assert.match(minQ, /Precio mínimo/);
  const [minBad] = await say('100');
  assert.match(minBad, /menor que el máximo/);
  await say('20');

  // excluded words + description
  const [descQ] = await say('réplica, fake');
  assert.match(descQ, /descripción/);
  const [summary] = await say('sí');
  assert.match(summary, /Resumen/);
  assert.match(summary, /20,00\s€ – 85,50\s€/);
  assert.match(summary, /réplica, fake \(título y descripción\)/);

  const done = await press('w:confirm:yes');
  assert.match(done.out[0].body.text, /Monitor creado/);
  const [m] = store.listMonitors();
  assert.equal(m.name, 'jordan 1');
  assert.equal(m.price_to, 85.5);
  assert.equal(m.price_from, 20);
  assert.deepEqual(m.catalog_ids, [1242]);
  assert.deepEqual(m.brand_ids, [53]);
  assert.deepEqual(m.exclude_words, ['réplica', 'fake']);
  assert.equal(m.check_description, true);
  assert.equal(m.primed, false, 'first pass will be silent');
  assert.deepEqual(synced, [m.id]);

  // the conversation is over: stale buttons do nothing
  const stale = await press('w:confirm:yes');
  assert.match(stale.out[0].body.text, /ya no está activo/);
  assert.equal(store.listMonitors().length, 1);
});

test('wizard: duplicate names, URL without filters, cancel and non-URL text', async () => {
  const { say, press, monitor, store } = botSetup();
  monitor('jordan 1');
  await say(URL_WITH_PRICE);
  const dup = await press('w:name:default');
  assert.match(dup.out[0].body.text, /Ya hay un monitor llamado/);
  const [cancel] = await say('/cancelar');
  assert.equal(cancel, 'Cancelado.');
  assert.match((await say('hola'))[0], /Pega aquí una URL/);
  assert.match((await say('https://www.vinted.es/catalog?order=newest_first'))[0], /no tiene ningún filtro/);
  assert.match((await say('/nuevo'))[0], /Pégalo aquí/);
  assert.equal(store.listMonitors().length, 1);
});

test('monitor card buttons: view, pause, check now, delete', async () => {
  const { say, press, buttons, monitor, store, ran } = botSetup();
  const m = monitor('Dunks', { price_from: 20, exclude_words: ['fake'] });

  const [list] = await say('/monitores');
  assert.match(list, /Toca uno/);
  assert.deepEqual(buttons().map((b) => b.callback_data), [`mon:${m.id}`]);

  const card = await press(`mon:${m.id}`);
  assert.equal(card.out[0].method, 'editMessageText');
  assert.equal(card.out[0].body.message_id, 7);
  assert.match(card.out[0].body.text, /Precio: 20,00\s€ – 80,00\s€/);
  assert.match(card.out[0].body.text, /Excluidas: fake/);

  const paused = await press(`pause:${m.id}`);
  assert.match(paused.toast, /pausado/);
  assert.equal(store.getMonitor(m.id).enabled, false);
  assert.ok(buttons().some((b) => b.callback_data === `resume:${m.id}`));
  assert.equal((await press(`run:${m.id}`)).toast, 'Está pausado');
  await press(`resume:${m.id}`);

  const run = await press(`run:${m.id}`);
  assert.equal(run.toast, 'Comprobado');
  assert.deepEqual(ran, [m.id]);
  assert.match(run.out[0].body.text, /96 resultados/);

  const ask = await press(`del:${m.id}`);
  assert.match(ask.out[0].body.text, /¿Borrar el monitor «Dunks»/);
  assert.equal(store.getMonitor(m.id) != null, true);
  const del = await press(`delok:${m.id}`);
  assert.equal(del.toast, 'Borrado');
  assert.equal(store.getMonitor(m.id), null);
  assert.match((await press(`mon:${m.id}`)).out[0].body.text, /ya no existe/);
});

test('buttons pressed from another chat are ignored', async () => {
  const { press, monitor, store } = botSetup();
  const m = monitor('Dunks');
  const r = await press(`delok:${m.id}`, { chatId: 666 });
  assert.equal(r.answered, true);
  assert.equal(r.out.length, 0);
  assert.ok(store.getMonitor(m.id));
});

test('editing fields; query changes force a silent first pass again', async () => {
  const { say, press, monitor, store, synced } = botSetup();
  const m = monitor('Dunks');
  store.patchMonitorState(m.id, { primed: true });

  assert.match((await say('/editar dunks'))[0], /¿Qué quieres cambiar\?/);

  await press(`ef:name:${m.id}`);
  const [renamed] = await say('Dunks Low');
  assert.match(renamed, /Guardado/);
  assert.equal(store.getMonitor(m.id).name, 'Dunks Low');
  assert.equal(store.getMonitor(m.id).primed, true, 'renaming does not touch the search');

  await press(`ef:exclude_words:${m.id}`);
  await say('caja, roto');
  assert.deepEqual(store.getMonitor(m.id).exclude_words, ['caja', 'roto']);
  await press(`ef:check_description:${m.id}`);
  assert.equal(store.getMonitor(m.id).check_description, true);
  assert.equal(store.getMonitor(m.id).primed, true);

  await press(`ef:price_to:${m.id}`);
  const [bad] = await say('-3');
  assert.match(bad, /precio máximo es obligatorio/);
  const [saved] = await say('60');
  assert.match(saved, /volverá a marcar lo existente como visto/);
  assert.equal(store.getMonitor(m.id).price_to, 60);
  assert.equal(store.getMonitor(m.id).primed, false);

  await press(`ef:price_from:${m.id}`);
  await say('15');
  assert.equal(store.getMonitor(m.id).price_from, 15);
  await press(`ef:price_from:${m.id}`);
  await say('no');
  assert.equal(store.getMonitor(m.id).price_from, null);

  await press(`ef:url:${m.id}`);
  await say('https://www.vinted.es/catalog?search_text=samba&brand_ids[]=14&price_to=70');
  const after = store.getMonitor(m.id);
  assert.equal(after.search_text, 'samba');
  assert.deepEqual(after.brand_ids, [14]);
  assert.equal(after.price_to, 70);
  assert.equal(after.name, 'Dunks Low');
  assert.deepEqual(after.exclude_words, ['caja', 'roto']);
  assert.ok(synced.includes(m.id));
});

test('/borrar, /ver and /pausar resolve names', async () => {
  const { say, press, buttons, monitor, store } = botSetup();
  const m = monitor('Chaquetas');
  assert.match((await say('/ver chaq'))[0], /🎯 <b>Chaquetas<\/b>/);
  assert.match((await say('/borrar chaquetas'))[0], /¿Borrar/);
  assert.equal(buttons()[0].callback_data, `delok:${m.id}`);
  await press(`mon:${m.id}`); // "No"
  assert.ok(store.getMonitor(m.id));
  assert.match((await say('/ver'))[0], /Indica el monitor/);
});

test('settings commands', async () => {
  const { say, store, rescheduledCount } = botSetup();
  assert.match((await say('/ajustes'))[0], /Intervalo: 45 s \(valor del \.env\)/);

  assert.match((await say('/silencio 23:00-7:30'))[0], /Guardado/);
  let s = store.getSettings();
  assert.deepEqual([s.quiet_enabled, s.quiet_start, s.quiet_end], [true, '23:00', '07:30']);
  await say('/silencio off');
  assert.equal(store.getSettings().quiet_enabled, false);
  assert.match((await say('/silencio mañana'))[0], /Uso: \/silencio/);

  await say('/avisos off');
  assert.equal(store.getSettings().notifications_enabled, false);
  await say('/avisos on');
  assert.equal(store.getSettings().notifications_enabled, true);

  assert.match((await say('/intervalo 5'))[0], /entre 15 y 3600/);
  await say('/intervalo 60');
  assert.equal(store.getSettings().poll_interval_seconds, 60);
  assert.equal(rescheduledCount(), 1);
  await say('/intervalo auto');
  assert.equal(store.getSettings().poll_interval_seconds, null);

  await say('/antiguedad 48');
  assert.equal(store.getSettings().max_item_age_hours, 48);
});

test('/encontrados and /registro', async () => {
  const { say, monitor, store, logger } = botSetup();
  const m = monitor('Dunks');
  assert.match((await say('/encontrados'))[0], /Aún no se ha encontrado nada/);
  store.recordFound({
    item_id: 5, title: 'Dunk Low', brand: 'Nike', size: '42', condition: 'Muy bueno', price: 45, total_price: 48,
    currency: 'EUR', photo_url: '', url: 'https://www.vinted.es/items/5', published_at: NOON - 600_000,
  }, m.id);
  const [all] = await say('/encontrados');
  assert.match(all, /<a href="https:\/\/www\.vinted\.es\/items\/5">Nike · Dunk Low<\/a>/);
  assert.match(all, /45,00\s€ · T\. 42/);
  assert.match(all, /\(Dunks\)/);
  assert.match((await say('/encontrados dunks'))[0], /Últimos encontrados · Dunks/);

  logger.error('vinted', 'Vinted respondió 500');
  logger.info('monitor', 'algo normal');
  const [log] = await say('/registro');
  assert.match(log, /❌ .*Vinted respondió 500/);
  assert.doesNotMatch(log, /algo normal/);
  assert.match((await say('/registro todo'))[0], /algo normal/);
});

test('very long replies are cut at a line boundary', async () => {
  const { say, monitor } = botSetup();
  for (let i = 0; i < 120; i++) monitor(`Monitor con un nombre bastante largo número ${i}`);
  const [text] = await say('/estado');
  assert.ok(text.length <= 4000);
  assert.ok(text.endsWith('\n…'));
});
