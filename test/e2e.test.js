'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { openDatabase } = require('../src/db');
const { createSniper } = require('../src/index');
const { validateConfig } = require('../src/config');
const { rawItem, headers, response, fakeTelegram, FAKE_TOKEN } = require('./helpers');

test('paste URL in Telegram -> monitor created -> new item alert with photo', async () => {
  let listing = [rawItem(2), rawItem(1)];
  const vintedFetch = async (url) => {
    if (url === 'https://www.vinted.es/') return response(200, { headers: headers({}, ['access_token_web=t; Path=/']) });
    return response(200, { json: { items: listing } });
  };
  const tg = fakeTelegram();
  const ctx = createSniper({
    cfg: {
      timezone: 'Europe/Madrid',
      vinted: { domain: 'www.vinted.es', pollIntervalSeconds: 45, userAgent: 't', minRequestGapMs: 0 },
      telegram: { token: FAKE_TOKEN, chatId: '42' },
    },
    db: openDatabase(':memory:'),
    fetchImpl: vintedFetch,
    telegramFetch: tg.fetchImpl,
    quietLogs: true,
  });
  const now = Math.floor(Date.now() / 1000);
  let id = 1;
  const say = (text) => ctx.bot.handleUpdate({ update_id: id++, message: { chat: { id: 42 }, date: now, text } });
  const press = (data) =>
    ctx.bot.handleUpdate({ update_id: id++, callback_query: { id: 'q', data, message: { message_id: 1, chat: { id: 42 } } } });

  await say('https://www.vinted.es/catalog?search_text=dunk&brand_ids[]=53&price_to=80');
  await say('Dunks');
  await press('w:price_to:default');
  await press('w:price_from:none');
  await press('w:exclude_words:none');
  await press('w:confirm:yes');
  const [m] = ctx.store.listMonitors();
  assert.equal(m.name, 'Dunks');
  assert.equal(m.price_to, 80);

  // First pass: learns the 2 existing items silently.
  await ctx.scheduler.check(m.id);
  assert.equal(tg.sent().filter((c) => c.method === 'sendPhoto').length, 0);

  // A new item shows up.
  listing = [rawItem(3, { title: 'Dunk Low Panda' }), ...listing];
  await ctx.scheduler.check(m.id);
  const photos = tg.sent().filter((c) => c.method === 'sendPhoto');
  assert.equal(photos.length, 1);
  assert.equal(photos[0].body.photo, 'https://images.vinted.net/3.jpg');
  assert.match(photos[0].body.caption, /Nike · Dunk Low Panda/);
  assert.match(photos[0].body.caption, /🎯 Dunks/);
  assert.equal(photos[0].body.reply_markup.inline_keyboard[0][0].url, 'https://www.vinted.es/items/3-item');

  ctx.scheduler.stop();
  ctx.bot.stop();
});

test('the app refuses to start without Telegram configuration', () => {
  const base = { vinted: { pollIntervalSeconds: 45 } };
  assert.equal(validateConfig({ ...base, telegram: { token: '', chatId: '' } }).errors.length, 2);
  assert.match(validateConfig({ ...base, telegram: { token: 'abc', chatId: '1' } }).errors[0], /formato/);
  assert.match(validateConfig({ ...base, telegram: { token: FAKE_TOKEN, chatId: '@yo' } }).errors[0], /número/);
  assert.deepEqual(validateConfig({ ...base, telegram: { token: FAKE_TOKEN, chatId: '-1001234' } }).errors, []);
});
