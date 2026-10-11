'use strict';

const { isQuietTime } = require('./quiet-hours');

const CAPTION_LIMIT = 1024; // Telegram limit for photo captions
const TITLE_LIMIT = 200;

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

function truncate(s, n) {
  s = String(s ?? '');
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function formatPrice(n, currency) {
  if (n == null) return '';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' }).format(n);
  } catch {
    return `${n} ${currency || ''}`.trim();
  }
}

function formatAgo(ts, now = Date.now()) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'publicado hace un momento';
  if (s < 3600) return `publicado hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `publicado hace ${Math.floor(s / 3600)} h`;
  return `publicado hace ${Math.floor(s / 86400)} d`;
}

/** Converts a row of found_items into the item shape used by the monitor. */
function itemFromRow(row) {
  return {
    id: row.item_id,
    title: row.title,
    brand: row.brand,
    size: row.size,
    condition: row.condition,
    price: row.price,
    totalPrice: row.total_price,
    currency: row.currency,
    photoUrl: row.photo_url,
    url: row.url,
    publishedAt: row.published_at,
  };
}

/** HTML caption: brand + title, price, size, condition, monitor. */
function formatCaption(item, monitorName, { test = false, now = Date.now() } = {}) {
  const title = truncate([item.brand, item.title].filter(Boolean).join(' · ') || 'Nuevo artículo', TITLE_LIMIT);
  const price = formatPrice(item.price, item.currency);
  const total =
    item.totalPrice != null && item.price != null && item.totalPrice !== item.price
      ? ` (${formatPrice(item.totalPrice, item.currency)} con protección)`
      : '';
  const details = [item.size && `📏 Talla ${escapeHtml(item.size)}`, item.condition && `✨ ${escapeHtml(item.condition)}`]
    .filter(Boolean)
    .join(' · ');
  const footer = [monitorName && `🎯 ${escapeHtml(truncate(monitorName, 80))}`, formatAgo(item.publishedAt, now)]
    .filter(Boolean)
    .join(' · ');
  const lines = [
    test ? '🧪 <b>PRUEBA</b> — así se verán los avisos' : null,
    `<b>${escapeHtml(title)}</b>`,
    price ? `💶 ${escapeHtml(price + total)}` : null,
    details || null,
    footer || null,
  ].filter(Boolean);
  return truncate(lines.join('\n'), CAPTION_LIMIT);
}

/**
 * Sends item alerts to the configured Telegram chat.
 * Photo + caption + "Ver en Vinted" button; falls back to a text message if
 * the photo cannot be sent. During quiet hours messages are sent silently.
 */
function createNotifier({ store, logger, api, chatId, timezone, now = Date.now }) {
  const configured = !!(api && chatId);
  const state = { lastOkAt: null, lastErrorAt: null, lastError: null };

  function recordOk() {
    state.lastOkAt = now();
  }
  function recordError(err) {
    state.lastErrorAt = now();
    state.lastError = err.message;
  }

  /** Sends one item. Returns 'photo' or 'text'; throws if both fail. */
  async function sendItem(item, monitorName, { silent = false, test = false } = {}) {
    const caption = formatCaption(item, monitorName, { test, now: now() });
    const common = {
      chat_id: chatId,
      parse_mode: 'HTML',
      disable_notification: silent,
      reply_markup: { inline_keyboard: [[{ text: 'Ver en Vinted', url: item.url }]] },
    };
    const onRetry = (s) => logger.warn('telegram', `Telegram pide esperar ${s} s (429); reintentando`);

    if (item.photoUrl) {
      try {
        await api.send('sendPhoto', { ...common, photo: item.photoUrl, caption }, { onRetry });
        recordOk();
        return 'photo';
      } catch (err) {
        if (err.code === 429) {
          recordError(err);
          throw err; // still rate-limited after the retries: a text message would fail too
        }
        logger.warn('telegram', `No se pudo enviar la foto del artículo ${item.id} (${err.message}); envío solo texto`);
      }
    }
    try {
      await api.send(
        'sendMessage',
        { ...common, text: caption, link_preview_options: { url: item.url, prefer_large_media: true } },
        { onRetry },
      );
      recordOk();
      return 'text';
    } catch (err) {
      recordError(err);
      throw err;
    }
  }

  /** Called by the monitor for every new match. Returns true if the alert was delivered. */
  async function notifyItem(item, monitorName) {
    if (!configured) {
      logger.warn('telegram', 'Telegram no está configurado: no se envía el aviso');
      return false;
    }
    const settings = store.getSettings();
    if (!settings.notifications_enabled) return false;
    const silent = isQuietTime(settings, timezone, new Date(now()));
    try {
      await sendItem(item, monitorName, { silent });
      return true;
    } catch (err) {
      logger.error('telegram', `No se pudo enviar el aviso del artículo ${item.id}: ${err.message}`);
      return false;
    }
  }

  /** Test alert: the latest real find if there is one, otherwise a text-only sample. */
  async function sendTest() {
    if (!configured) throw new Error('Telegram no está configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)');
    const [latest] = store.listFound({ limit: 1 });
    const item = latest
      ? itemFromRow(latest)
      : {
          id: 0,
          title: 'Zapatillas de ejemplo',
          brand: 'Marca',
          size: '42',
          condition: 'Muy bueno',
          price: 45,
          totalPrice: 48.05,
          currency: 'EUR',
          photoUrl: '',
          url: 'https://www.vinted.es/',
          publishedAt: now() - 120_000,
        };
    const monitorName = latest?.monitors?.[0]?.name || 'Monitor de ejemplo';
    const mode = await sendItem(item, monitorName, { test: true });
    return { mode, usedRealItem: !!latest };
  }

  /** Plain message to the configured chat (bot replies). */
  async function sendText(text) {
    return api.send('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }

  function status() {
    return { configured, ...state };
  }

  return { configured, notifyItem, sendTest, sendText, sendItem, status };
}

module.exports = { createNotifier, formatCaption, escapeHtml, formatPrice, itemFromRow };
