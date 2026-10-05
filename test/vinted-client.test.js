'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { VintedClient } = require('../src/vinted/client');
const { rawItem, headers, response } = require('./helpers');

function makeClient(handler) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, opts });
    return handler(url, opts, calls);
  };
  const client = new VintedClient({ domain: 'www.vinted.es', userAgent: 'test', minRequestGapMs: 0, fetchImpl });
  return { client, calls };
}

test('gets a session from the home page, then sends its cookies to the API', async () => {
  const { client, calls } = makeClient((url) => {
    if (url === 'https://www.vinted.es/') {
      return response(200, { headers: headers({}, ['access_token_web=tok1; Path=/; HttpOnly', 'anon_id=a1; Path=/']) });
    }
    return response(200, { json: { items: [rawItem(1), rawItem(2)] } });
  });
  const items = await client.search({ search_text: 'dunk', catalog_ids: [1242], brand_ids: [53], price_to: 80 });
  assert.equal(items.length, 2);
  assert.equal(items[0].id, 1);
  assert.equal(items[0].price, 30);
  assert.equal(items[0].totalPrice, 32.2);
  assert.equal(items[0].brand, 'Nike');
  assert.equal(calls.length, 2);
  const api = new URL(calls[1].url);
  assert.equal(api.pathname, '/api/v2/catalog/items');
  assert.equal(api.searchParams.get('order'), 'newest_first');
  assert.equal(api.searchParams.get('search_text'), 'dunk');
  assert.equal(api.searchParams.get('catalog_ids'), '1242');
  assert.equal(api.searchParams.get('brand_ids'), '53');
  assert.equal(api.searchParams.get('price_to'), '80');
  assert.match(calls[1].opts.headers.Cookie, /access_token_web=tok1/);
  assert.match(calls[1].opts.headers.Cookie, /anon_id=a1/);
});

test('keeps cookies set on redirect hops', async () => {
  const { client } = makeClient((url) => {
    if (url === 'https://www.vinted.es/') {
      return response(302, { headers: headers({ location: '/?lang=es' }, ['anon_id=a1; Path=/']) });
    }
    if (url === 'https://www.vinted.es/?lang=es') {
      return response(200, { headers: headers({}, ['access_token_web=tok; Path=/']) });
    }
    return response(200, { json: { items: [] } });
  });
  await client.refreshSession();
  assert.equal(client.cookies.get('anon_id'), 'a1');
  assert.equal(client.cookies.get('access_token_web'), 'tok');
});

test('renews the session once on 401', async () => {
  let session = 0;
  let apiCalls = 0;
  const { client } = makeClient((url, opts) => {
    if (url === 'https://www.vinted.es/') {
      session++;
      return response(200, { headers: headers({}, [`access_token_web=tok${session}; Path=/`]) });
    }
    apiCalls++;
    if (opts.headers.Cookie.includes('tok1')) return response(401, { json: {} });
    return response(200, { json: { items: [rawItem(7)] } });
  });
  const items = await client.search({ price_to: 10 });
  assert.equal(items[0].id, 7);
  assert.equal(session, 2);
  assert.equal(apiCalls, 2);
});

test('429 starts a global exponential backoff that resets on success', async () => {
  let mode = 429;
  let now = 1_000_000;
  const fetchImpl = async (url) => {
    if (url === 'https://www.vinted.es/') return response(200, { headers: headers({}, ['access_token_web=t; Path=/']) });
    if (mode === 429) return response(429, { headers: headers({ 'retry-after': '5' }) });
    return response(200, { json: { items: [] } });
  };
  const client = new VintedClient({ domain: 'www.vinted.es', userAgent: 't', minRequestGapMs: 0, fetchImpl, now: () => now });

  await assert.rejects(client.search({ price_to: 1 }), (e) => e.kind === 'limited' && e.status === 429 && e.retryAfterMs === 60_000);
  assert.equal(client.isBlocked(), true);
  // While blocked, no request is made.
  await assert.rejects(client.search({ price_to: 1 }), /pausa/);

  now += 61_000;
  await assert.rejects(client.search({ price_to: 1 }), (e) => e.retryAfterMs === 120_000);

  now += 121_000;
  mode = 200;
  await client.search({ price_to: 1 });
  assert.equal(client.backoffLevel, 0);
});

test('403 drops cookies so the next attempt starts a fresh session', async () => {
  let sessions = 0;
  let now = 0;
  let blocked = true;
  const fetchImpl = async (url) => {
    if (url === 'https://www.vinted.es/') {
      sessions++;
      return response(200, { headers: headers({}, ['access_token_web=t; Path=/']) });
    }
    return blocked ? response(403) : response(200, { json: { items: [] } });
  };
  const client = new VintedClient({ domain: 'www.vinted.es', userAgent: 't', minRequestGapMs: 0, fetchImpl, now: () => now });
  await assert.rejects(client.search({ price_to: 1 }), (e) => e.kind === 'limited');
  assert.equal(client.cookies.size, 0);
  blocked = false;
  now += 10 * 60_000;
  await client.search({ price_to: 1 });
  assert.equal(sessions, 2);
});
