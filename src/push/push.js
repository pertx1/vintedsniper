'use strict';

const webpush = require('web-push');
const { isQuietTime } = require('./quiet-hours');

/**
 * Web Push delivery. Subscriptions that the push service reports as gone
 * (404/410) are removed from the database.
 */
function createPush({ store, logger, vapid, timezone, sender = webpush }) {
  const configured = !!(vapid.publicKey && vapid.privateKey);
  if (configured) sender.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);

  async function sendToAll(payload, { urgency = 'high', ttl = 3600 } = {}) {
    if (!configured) {
      logger.warn('push', 'Claves VAPID no configuradas: no se envía la notificación');
      return { sent: 0, failed: 0, removed: 0 };
    }
    const subs = store.listSubscriptions();
    const body = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;
    let removed = 0;
    await Promise.all(
      subs.map(async (sub) => {
        try {
          await sender.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            body,
            { TTL: ttl, urgency },
          );
          store.markSubscriptionOk(sub.id);
          sent++;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            store.deleteSubscription(sub.id);
            removed++;
            logger.info('push', `Suscripción caducada eliminada (${err.statusCode})`);
          } else {
            failed++;
            logger.error('push', `Error enviando push (${err.statusCode || 'sin código'}): ${err.body || err.message}`);
          }
        }
      }),
    );
    return { sent, failed, removed };
  }

  function formatPrice(n, currency) {
    if (n == null) return '';
    try {
      return new Intl.NumberFormat('es-ES', { style: 'currency', currency: currency || 'EUR' }).format(n);
    } catch {
      return `${n} ${currency || ''}`.trim();
    }
  }

  function itemPayload(item, monitorName) {
    const title = [item.brand, item.title].filter(Boolean).join(' · ') || 'Nuevo artículo';
    const price = formatPrice(item.price, item.currency);
    const body = [
      price && item.totalPrice && item.totalPrice !== item.price
        ? `${price} (${formatPrice(item.totalPrice, item.currency)} total)`
        : price,
      item.size && `Talla ${item.size}`,
      item.condition,
      monitorName && `[${monitorName}]`,
    ]
      .filter(Boolean)
      .join(' · ');
    return {
      title,
      body,
      url: item.url,
      image: item.photoUrl || undefined,
      tag: `item-${item.id}`,
    };
  }

  /**
   * Notifies about a found item, respecting the global switch and quiet hours.
   * Returns true if a notification was sent.
   */
  async function notifyItem(item, monitorName) {
    const settings = store.getSettings();
    if (!settings.notifications_enabled) return false;
    if (isQuietTime(settings, timezone)) {
      store.setSettings({ quiet_pending: (settings.quiet_pending || 0) + 1 });
      return false;
    }
    const res = await sendToAll(itemPayload(item, monitorName));
    return res.sent > 0;
  }

  /** Called periodically: once quiet hours are over, send a summary of what was held back. */
  async function flushQuietSummary() {
    const settings = store.getSettings();
    const pending = settings.quiet_pending || 0;
    if (!pending || isQuietTime(settings, timezone)) return;
    store.setSettings({ quiet_pending: 0 });
    if (!settings.quiet_summary || !settings.notifications_enabled) return;
    await sendToAll(
      {
        title: 'Vinted Sniper',
        body:
          pending === 1
            ? '1 artículo nuevo durante el horario silencioso'
            : `${pending} artículos nuevos durante el horario silencioso`,
        url: '/#found',
        tag: 'quiet-summary',
      },
      { urgency: 'normal' },
    );
  }

  async function sendTest() {
    return sendToAll({
      title: 'Vinted Sniper',
      body: '¡Las notificaciones funcionan! 🎯',
      url: '/#settings',
      tag: 'test',
    });
  }

  return { configured, publicKey: vapid.publicKey, sendToAll, notifyItem, flushQuietSummary, sendTest, itemPayload };
}

module.exports = { createPush };
