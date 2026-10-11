'use strict';

/**
 * Minimal Telegram Bot API client (https://core.telegram.org/bots/api).
 *
 * The bot token is part of every request URL, so every error message that
 * leaves this module goes through redact() to make sure it never reaches the
 * logs or the web UI.
 */

const MAX_RETRY_AFTER_S = 300;

class TelegramError extends Error {
  constructor(message, { method = '', code = 0, retryAfter = 0 } = {}) {
    super(message);
    this.name = 'TelegramError';
    this.method = method;
    this.code = code; // Telegram error_code or HTTP status; 0 = network error
    this.retryAfter = retryAfter;
  }
}

function createTelegramApi({
  token,
  fetchImpl = globalThis.fetch,
  minSendGapMs = 1100,
  maxRetries = 3,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  now = Date.now,
}) {
  if (!token) throw new Error('Falta el token del bot de Telegram');
  const base = `https://api.telegram.org/bot${token}/`;

  function redact(text) {
    return String(text ?? '').split(token).join('***');
  }

  async function callOnce(method, params, { timeoutMs = 20_000, signal } = {}) {
    let res;
    try {
      const signals = [AbortSignal.timeout(timeoutMs)];
      if (signal) signals.push(signal);
      res = await fetchImpl(base + method, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
        signal: AbortSignal.any(signals),
      });
    } catch (err) {
      const cause = err.cause?.code || err.cause?.message || '';
      throw new TelegramError(redact(`Error de red con Telegram (${method}): ${err.message}${cause ? ` [${cause}]` : ''}`), { method });
    }
    let body;
    try {
      body = await res.json();
    } catch {
      throw new TelegramError(`Telegram respondió ${res.status} sin JSON en ${method}`, { method, code: res.status });
    }
    if (!body.ok) {
      throw new TelegramError(redact(`Telegram ${method}: ${body.error_code || res.status} ${body.description || ''}`.trim()), {
        method,
        code: body.error_code || res.status,
        retryAfter: Number(body.parameters?.retry_after) || 0,
      });
    }
    return body.result;
  }

  /** Calls a method, waiting and retrying when Telegram answers 429 with retry_after. */
  async function call(method, params, opts = {}) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await callOnce(method, params, opts);
      } catch (err) {
        if (err.code !== 429 || attempt >= maxRetries) throw err;
        const waitS = Math.min(Math.max(err.retryAfter || 1, 1), MAX_RETRY_AFTER_S);
        opts.onRetry?.(waitS, err);
        await sleep(waitS * 1000);
      }
    }
  }

  // Messages to the same chat go through a queue with a minimum gap (Telegram
  // allows about one message per second per chat).
  let queue = Promise.resolve();
  let lastSendAt = 0;
  function send(method, params, opts) {
    const run = async () => {
      const wait = lastSendAt + minSendGapMs - now();
      if (wait > 0) await sleep(wait);
      try {
        return await call(method, params, opts);
      } finally {
        lastSendAt = now();
      }
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  return { call, send, redact };
}

module.exports = { createTelegramApi, TelegramError };
