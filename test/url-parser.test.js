'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseVintedUrl } = require('../src/vinted/url-parser');

test('parses a full catalog URL with array params', () => {
  const p = parseVintedUrl(
    'https://www.vinted.es/catalog?search_text=jordan%201&catalog[]=1242&brand_ids[]=53&brand_ids[]=14&size_ids[]=785&status_ids[]=6&status_ids[]=1&price_from=20&price_to=120&currency=EUR&order=newest_first&time=1700000000',
  );
  assert.equal(p.search_text, 'jordan 1');
  assert.deepEqual(p.catalog_ids, [1242]);
  assert.deepEqual(p.brand_ids, [53, 14]);
  assert.deepEqual(p.size_ids, [785]);
  assert.deepEqual(p.status_ids, [6, 1]);
  assert.equal(p.price_from, 20);
  assert.equal(p.price_to, 120);
  assert.deepEqual(p.extra_params, {});
  assert.equal(p.domain, 'www.vinted.es');
});

test('accepts URL-encoded brackets and indexed arrays', () => {
  const p = parseVintedUrl('https://www.vinted.es/catalog?catalog%5B%5D=2050&brand_ids%5B0%5D=88&color_ids%5B%5D=1&color_ids%5B%5D=12');
  assert.deepEqual(p.catalog_ids, [2050]);
  assert.deepEqual(p.brand_ids, [88]);
  assert.deepEqual(p.extra_params, { color_ids: [1, 12] });
});

test('reads the category from the path', () => {
  const p = parseVintedUrl('https://www.vinted.fr/catalog/1242-sneakers?brand_ids[]=53&price_to=50.5');
  assert.deepEqual(p.catalog_ids, [1242]);
  assert.equal(p.price_to, 50.5);
  assert.equal(p.domain, 'www.vinted.fr');
});

test('rejects non-Vinted URLs and garbage', () => {
  assert.throws(() => parseVintedUrl('https://example.com/catalog?x=1'), /no es de Vinted/);
  assert.throws(() => parseVintedUrl('hola'), /URL válida/);
  assert.throws(() => parseVintedUrl('https://vinted.evil.com/catalog'), /no es de Vinted/);
});
