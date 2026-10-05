'use strict';

/**
 * Turns a Vinted catalog URL (copied from the browser) into monitor filters.
 *
 * Supported shapes:
 *   https://www.vinted.es/catalog?search_text=nike&catalog[]=1242&brand_ids[]=53&size_ids[]=785&status_ids[]=6&price_to=80&currency=EUR&order=newest_first
 *   https://www.vinted.es/catalog/1242-zapatillas?brand_ids[]=53
 *   https://www.vinted.es/vetements?search_text=...      (any path, only the query matters)
 */

// Query keys that are meaningless for a monitor (pagination, tracking, sort order...).
const IGNORED_KEYS = new Set([
  'order', 'page', 'per_page', 'time', 'search_id', 'search_session_id', 'global_search_session_id',
  'search_by_image_uuid', 'disabled_personalization', 'catalog_from', 'currency', 'utm_source',
  'utm_medium', 'utm_campaign', 'referrer', 'ref',
]);

const LIST_KEYS = {
  catalog: 'catalog_ids',
  catalog_ids: 'catalog_ids',
  brand_ids: 'brand_ids',
  brand_id: 'brand_ids',
  size_ids: 'size_ids',
  size_id: 'size_ids',
  status_ids: 'status_ids',
  status: 'status_ids',
};

function toIntList(values) {
  const out = [];
  for (const v of values) {
    for (const part of String(v).split(',')) {
      const n = Number.parseInt(part.trim(), 10);
      if (Number.isFinite(n) && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

function parseVintedUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    throw new Error('No es una URL válida');
  }
  if (!/^([a-z0-9-]+\.)*vinted\.(com|co\.uk|[a-z]{2})$/i.test(url.hostname)) {
    throw new Error('La URL no es de Vinted');
  }

  // Group repeated keys, removing the "[]" suffix: catalog[]=1&catalog[]=2 -> catalog: [1, 2]
  const raw = new Map();
  for (const [k, v] of url.searchParams) {
    const key = k.replace(/\[\d*\]$/, '');
    if (!raw.has(key)) raw.set(key, []);
    raw.get(key).push(v);
  }

  const result = {
    domain: url.hostname,
    search_text: '',
    catalog_ids: [],
    brand_ids: [],
    size_ids: [],
    status_ids: [],
    price_from: null,
    price_to: null,
    extra_params: {},
    source_url: url.toString(),
  };

  // /catalog/1242-zapatillas
  const pathMatch = url.pathname.match(/\/catalog\/(\d+)/);
  if (pathMatch) result.catalog_ids.push(Number(pathMatch[1]));

  for (const [key, values] of raw) {
    if (IGNORED_KEYS.has(key)) continue;
    if (key in LIST_KEYS) {
      const target = LIST_KEYS[key];
      for (const n of toIntList(values)) if (!result[target].includes(n)) result[target].push(n);
    } else if (key === 'search_text') {
      result.search_text = values[values.length - 1].trim();
    } else if (key === 'price_from' || key === 'price_to') {
      const n = Number.parseFloat(values[values.length - 1].replace(',', '.'));
      if (Number.isFinite(n)) result[key] = n;
    } else if (key.endsWith('_ids')) {
      // color_ids, material_ids, patterns_ids, video_game_platform_ids...
      const ids = toIntList(values);
      if (ids.length) result.extra_params[key] = ids;
    } else {
      const v = values[values.length - 1];
      if (v !== '') result.extra_params[key] = v;
    }
  }

  return result;
}

module.exports = { parseVintedUrl };
