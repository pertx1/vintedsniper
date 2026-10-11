'use strict';

const { openDatabase } = require('../src/db');
const { createStore } = require('../src/store');
const { createLogger } = require('../src/logger');

function makeDb() {
  const db = openDatabase(':memory:');
  return { db, store: createStore(db), logger: createLogger(db, { quiet: true }) };
}

/** Builds a raw Vinted catalog item as returned by /api/v2/catalog/items. */
function rawItem(id, extra = {}) {
  return {
    id,
    title: `Item ${id}`,
    price: { amount: '30.0', currency_code: 'EUR' },
    total_item_price: { amount: '32.2', currency_code: 'EUR' },
    brand_title: 'Nike',
    size_title: '42',
    status: 'Muy bueno',
    url: `https://www.vinted.es/items/${id}-item`,
    photo: {
      url: `https://images.vinted.net/${id}.jpg`,
      high_resolution: { timestamp: Math.floor(Date.now() / 1000) - 60 },
    },
    ...extra,
  };
}

function headers(obj = {}, cookies = []) {
  const h = new Headers(obj);
  for (const c of cookies) h.append('set-cookie', c);
  return h;
}

/** Minimal fetch Response stand-in (real Response hides Set-Cookie on redirects). */
function response(status, { json, text = '', headers: hdrs } = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: hdrs || new Headers(),
    json: async () => (json !== undefined ? json : JSON.parse(text)),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

module.exports = { makeDb, rawItem, headers, response };

const FAKE_TOKEN = '123456789:AAFakeTokenForTestsOnly_abcdefghij';

/**
 * Fake Telegram Bot API. `handlers[method]` can return a result, or
 * { error_code, description, parameters } to simulate a failure.
 */
function fakeTelegram(handlers = {}) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    const method = url.split('/').pop();
    const body = JSON.parse(opts.body || '{}');
    calls.push({ url, method, body });
    const h = handlers[method];
    const out = typeof h === 'function' ? await h(body, calls) : h;
    if (out && out.error_code) {
      return { status: out.error_code, json: async () => ({ ok: false, ...out }) };
    }
    const defaults = {
      getMe: { id: 1, username: 'sniper_test_bot' },
      sendPhoto: { message_id: calls.length },
      sendMessage: { message_id: calls.length },
    };
    return { status: 200, json: async () => ({ ok: true, result: out ?? defaults[method] ?? true }) };
  };
  return { calls, fetchImpl, sent: () => calls.filter((c) => c.method === 'sendPhoto' || c.method === 'sendMessage') };
}

module.exports.FAKE_TOKEN = FAKE_TOKEN;
module.exports.fakeTelegram = fakeTelegram;
