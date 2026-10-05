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
