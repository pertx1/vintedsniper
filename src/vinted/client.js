'use strict';

/**
 * Minimal client for the internal API that the Vinted web app uses.
 *
 * How the website works (2024-2026):
 *  - Visiting the home page (https://<domain>/) sets anonymous session cookies,
 *    the important one being `access_token_web` (a short-lived JWT), plus
 *    `refresh_token_web`, `anon_id`, `v_udt`, etc.
 *  - The catalog page loads its results from
 *      GET /api/v2/catalog/items?page=1&per_page=96&order=newest_first&...
 *    sending those cookies. Without them the API answers 401.
 *  - When the token expires the API answers 401 again: we just visit the home
 *    page once more to get a fresh one.
 *  - 403 (anti-bot / Cloudflare / DataDome) and 429 (rate limit) mean "slow down".
 *    Those apply to the whole IP, so the backoff here is global for all monitors.
 */

const BACKOFF_BASE_MS = 60_000;
const BACKOFF_MAX_MS = 30 * 60_000;

class VintedError extends Error {
  constructor(message, { status = 0, retryAfterMs = 0, kind = 'error' } = {}) {
    super(message);
    this.name = 'VintedError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
    this.kind = kind; // 'limited' | 'error'
  }
}

class VintedClient {
  constructor({ domain, userAgent, minRequestGapMs = 1500, fetchImpl = globalThis.fetch, logger = null, now = Date.now }) {
    this.domain = domain;
    this.baseUrl = `https://${domain}`;
    this.userAgent = userAgent;
    this.minRequestGapMs = minRequestGapMs;
    this.fetch = fetchImpl;
    this.logger = logger;
    this.now = now;

    this.cookies = new Map();
    this.sessionAt = 0;
    this.sessionPromise = null;

    this.queue = Promise.resolve();
    this.lastRequestAt = 0;

    this.blockedUntil = 0;
    this.backoffLevel = 0;
    this.lastBlockStatus = 0;
    this.stats = { requests: 0, ok: 0, errors: 0, limited: 0, sessionRefreshes: 0, lastOkAt: 0 };
  }

  // ---------------------------------------------------------------- cookies

  storeCookies(res) {
    const list = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    for (const raw of list) {
      const [pair, ...attrs] = raw.split(';');
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      const expired = attrs.some((a) => {
        const [k, v] = a.split('=').map((s) => s && s.trim().toLowerCase());
        return (k === 'max-age' && Number(v) <= 0) || (k === 'expires' && Date.parse(v) < this.now());
      });
      if (expired || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }

  cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  hasSession() {
    return this.cookies.has('access_token_web') || this.cookies.size > 0;
  }

  baseHeaders(extra = {}) {
    const h = {
      'User-Agent': this.userAgent,
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      ...extra,
    };
    const cookie = this.cookieHeader();
    if (cookie) h.Cookie = cookie;
    return h;
  }

  // ---------------------------------------------------------------- session

  /** Visits the home page to obtain fresh anonymous session cookies. */
  async refreshSession() {
    if (this.sessionPromise) return this.sessionPromise;
    this.sessionPromise = (async () => {
      this.cookies.clear();
      let url = this.baseUrl + '/';
      // Follow redirects manually so cookies set on every hop are kept.
      for (let hop = 0; hop < 5; hop++) {
        const res = await this.rawFetch(url, {
          headers: this.baseHeaders({
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }),
          redirect: 'manual',
        });
        this.storeCookies(res);
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
          url = new URL(res.headers.get('location'), url).toString();
          continue;
        }
        if (res.status === 403 || res.status === 429) {
          throw this.limitedError(res, 'al obtener la sesión');
        }
        if (!res.ok) {
          throw new VintedError(`La página principal de Vinted respondió ${res.status}`, { status: res.status });
        }
        await res.arrayBuffer().catch(() => {});
        break;
      }
      if (!this.cookies.has('access_token_web')) {
        this.logger?.warn('vinted', `La página principal no devolvió access_token_web (cookies: ${[...this.cookies.keys()].join(', ') || 'ninguna'})`);
      }
      this.sessionAt = this.now();
      this.stats.sessionRefreshes++;
      this.logger?.info('vinted', 'Sesión de Vinted renovada');
    })();
    try {
      await this.sessionPromise;
    } finally {
      this.sessionPromise = null;
    }
  }

  async ensureSession() {
    if (!this.hasSession()) await this.refreshSession();
  }

  // ---------------------------------------------------------------- requests

  /** Serializes all requests and keeps a minimum gap between them. */
  rawFetch(url, options) {
    const run = async () => {
      const wait = this.lastRequestAt + this.minRequestGapMs - this.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastRequestAt = this.now();
      this.stats.requests++;
      return this.fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  isBlocked() {
    return this.blockedUntil > this.now();
  }

  limitedError(res, context) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 0;
    const backoff = Math.min(BACKOFF_BASE_MS * 2 ** this.backoffLevel, BACKOFF_MAX_MS);
    const delay = Math.max(backoff, retryAfterMs);
    this.backoffLevel = Math.min(this.backoffLevel + 1, 10);
    this.blockedUntil = this.now() + delay;
    this.lastBlockStatus = res.status;
    this.stats.limited++;
    // A 403 usually means the anti-bot flagged our cookies: start over next time.
    if (res.status === 403) this.cookies.clear();
    return new VintedError(
      `Vinted respondió ${res.status} ${context}; pausa de ${Math.round(delay / 1000)} s`,
      { status: res.status, retryAfterMs: delay, kind: 'limited' },
    );
  }

  async getJson(path, { retryOn401 = true } = {}) {
    if (this.isBlocked()) {
      throw new VintedError('En pausa por límite de Vinted', {
        status: this.lastBlockStatus,
        retryAfterMs: this.blockedUntil - this.now(),
        kind: 'limited',
      });
    }
    await this.ensureSession();

    let res;
    try {
      res = await this.rawFetch(this.baseUrl + path, {
        headers: this.baseHeaders({
          Accept: 'application/json, text/plain, */*',
          Referer: this.baseUrl + '/catalog',
        }),
      });
    } catch (err) {
      this.stats.errors++;
      throw new VintedError(`Error de red: ${err.message}`);
    }
    this.storeCookies(res);

    if (res.status === 401 && retryOn401) {
      await res.arrayBuffer().catch(() => {});
      this.logger?.info('vinted', '401 de Vinted: renovando sesión');
      await this.refreshSession();
      return this.getJson(path, { retryOn401: false });
    }
    if (res.status === 403 || res.status === 429) {
      await res.arrayBuffer().catch(() => {});
      throw this.limitedError(res, `en ${path.split('?')[0]}`);
    }
    if (!res.ok) {
      this.stats.errors++;
      await res.arrayBuffer().catch(() => {});
      throw new VintedError(`Vinted respondió ${res.status} en ${path.split('?')[0]}`, { status: res.status });
    }

    let body;
    try {
      body = await res.json();
    } catch {
      this.stats.errors++;
      throw new VintedError('Vinted devolvió una respuesta que no es JSON');
    }
    this.backoffLevel = 0;
    this.stats.ok++;
    this.stats.lastOkAt = this.now();
    return body;
  }

  // ---------------------------------------------------------------- API

  static buildSearchQuery(monitor, { perPage = 96 } = {}) {
    const q = new URLSearchParams();
    q.set('page', '1');
    q.set('per_page', String(perPage));
    q.set('order', 'newest_first');
    if (monitor.search_text) q.set('search_text', monitor.search_text);
    const list = (key, arr) => {
      if (arr && arr.length) q.set(key, arr.join(','));
    };
    list('catalog_ids', monitor.catalog_ids);
    list('brand_ids', monitor.brand_ids);
    list('size_ids', monitor.size_ids);
    list('status_ids', monitor.status_ids);
    for (const [key, value] of Object.entries(monitor.extra_params || {})) {
      if (Array.isArray(value)) list(key, value);
      else if (value !== '' && value != null) q.set(key, String(value));
    }
    if (monitor.price_from != null && monitor.price_from !== '') q.set('price_from', String(monitor.price_from));
    if (monitor.price_to != null && monitor.price_to !== '') q.set('price_to', String(monitor.price_to));
    if (monitor.currency) q.set('currency', monitor.currency);
    return q.toString();
  }

  /** Returns the newest catalog items for a monitor, normalized. */
  async search(monitor) {
    const body = await this.getJson('/api/v2/catalog/items?' + VintedClient.buildSearchQuery(monitor));
    if (!body || !Array.isArray(body.items)) {
      throw new VintedError('Respuesta del catálogo sin "items"');
    }
    return body.items.map((it) => normalizeItem(it, this.baseUrl));
  }

  /**
   * Best effort: fetches an item's description. The catalog listing does not
   * include it. Returns null if it could not be obtained.
   */
  async getDescription(itemId) {
    for (const path of [`/api/v2/items/${itemId}/details`, `/api/v2/items/${itemId}`]) {
      try {
        const body = await this.getJson(path);
        const desc = body?.item?.description ?? body?.description;
        if (typeof desc === 'string') return desc;
      } catch (err) {
        if (err.kind === 'limited') throw err;
      }
    }
    return null;
  }

  status() {
    return {
      domain: this.domain,
      hasSession: this.hasSession(),
      hasAccessToken: this.cookies.has('access_token_web'),
      sessionAt: this.sessionAt || null,
      blocked: this.isBlocked(),
      blockedUntil: this.isBlocked() ? this.blockedUntil : null,
      lastBlockStatus: this.lastBlockStatus || null,
      backoffLevel: this.backoffLevel,
      ...this.stats,
    };
  }
}

function money(v) {
  if (v == null) return null;
  if (typeof v === 'object') v = v.amount;
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

/** Converts a raw catalog item into the shape the rest of the app uses. */
function normalizeItem(it, baseUrl) {
  const photo = it.photo || (Array.isArray(it.photos) ? it.photos[0] : null) || {};
  const thumb = Array.isArray(photo.thumbnails)
    ? photo.thumbnails.find((t) => t.type === 'thumb310x430') || photo.thumbnails.find((t) => t.type === 'thumb310')
    : null;
  const ts = photo.high_resolution?.timestamp;
  const url = it.url || (it.path ? baseUrl + it.path : `${baseUrl}/items/${it.id}`);
  return {
    id: Number(it.id),
    title: it.title || '',
    brand: it.brand_title || it.brand?.title || '',
    size: it.size_title || it.size || '',
    condition: typeof it.status === 'string' ? it.status : it.status?.title || '',
    price: money(it.price),
    totalPrice: money(it.total_item_price),
    currency: it.price?.currency_code || it.currency || 'EUR',
    photoUrl: photo.url || thumb?.url || photo.full_size_url || '',
    url,
    publishedAt: Number.isFinite(ts) ? ts * 1000 : null,
    promoted: !!(it.promoted || it.is_promoted),
    description: typeof it.description === 'string' ? it.description : null,
  };
}

module.exports = { VintedClient, VintedError, normalizeItem, BACKOFF_BASE_MS, BACKOFF_MAX_MS };
