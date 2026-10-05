'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findExcludedWord, checkItem } = require('../src/monitor/filters');
const { isQuietTime } = require('../src/push/quiet-hours');

test('excluded words match whole words, ignoring accents and case', () => {
  assert.equal(findExcludedWord('Nike Dunk RÉPLICA talla 42', ['replica']), 'replica');
  assert.equal(findExcludedWord('Zapatillas repasadas', ['rep']), null);
  assert.equal(findExcludedWord('Solo la caja original', ['caja']), 'caja');
  assert.equal(findExcludedWord('Es no original, ojo', ['no original']), 'no original');
  assert.equal(findExcludedWord('Nike Dunk Low', []), null);
});

test('checkItem applies price range, excluded words and max age', () => {
  const monitor = { price_from: 20, price_to: 100, exclude_words: ['fake'] };
  const base = { title: 'Dunk Low', brand: 'Nike', price: 50, publishedAt: Date.now() - 3600_000 };
  assert.equal(checkItem(base, monitor).ok, true);
  assert.equal(checkItem({ ...base, price: 101 }, monitor).ok, false);
  assert.equal(checkItem({ ...base, price: 10 }, monitor).ok, false);
  assert.equal(checkItem({ ...base, title: 'Dunk FAKE' }, monitor).ok, false);
  assert.equal(checkItem({ ...base, publishedAt: Date.now() - 48 * 3600_000 }, monitor, { maxAgeHours: 24 }).ok, false);
  assert.equal(checkItem({ ...base, publishedAt: Date.now() - 48 * 3600_000 }, monitor, { maxAgeHours: 0 }).ok, true);
});

test('quiet hours handle windows crossing midnight in the given time zone', () => {
  const s = { quiet_enabled: true, quiet_start: '00:00', quiet_end: '08:00' };
  // 2026-01-15 is winter: Madrid = UTC+1
  assert.equal(isQuietTime(s, 'Europe/Madrid', new Date('2026-01-15T05:00:00Z')), true); // 06:00
  assert.equal(isQuietTime(s, 'Europe/Madrid', new Date('2026-01-15T07:30:00Z')), false); // 08:30
  const night = { quiet_enabled: true, quiet_start: '23:00', quiet_end: '07:00' };
  assert.equal(isQuietTime(night, 'Europe/Madrid', new Date('2026-01-15T22:30:00Z')), true); // 23:30
  assert.equal(isQuietTime(night, 'Europe/Madrid', new Date('2026-01-15T12:00:00Z')), false);
  assert.equal(isQuietTime({ ...night, quiet_enabled: false }, 'Europe/Madrid', new Date('2026-01-15T22:30:00Z')), false);
});
