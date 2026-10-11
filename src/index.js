'use strict';

const { config, validateConfig } = require('./config');
const { openDatabase } = require('./db');
const { createLogger } = require('./logger');
const { createStore } = require('./store');
const { VintedClient } = require('./vinted/client');
const { createTelegramApi } = require('./telegram/api');
const { createNotifier } = require('./telegram/notifier');
const { TelegramBot } = require('./telegram/bot');
const { Scheduler } = require('./monitor/scheduler');
const { createMonitorActions } = require('./monitor/actions');

/**
 * Wires everything together. There is no web server: the only interface is
 * the Telegram bot, which talks to Telegram over outgoing HTTPS (long polling).
 */
function createSniper({ cfg = config, db, fetchImpl, telegramFetch, quietLogs = false } = {}) {
  db = db || openDatabase(cfg.dbPath);
  const logger = createLogger(db, { quiet: quietLogs });
  const store = createStore(db);
  const client = new VintedClient({
    domain: cfg.vinted.domain,
    userAgent: cfg.vinted.userAgent,
    minRequestGapMs: cfg.vinted.minRequestGapMs,
    fetchImpl,
    logger,
  });
  const api = createTelegramApi({ token: cfg.telegram.token, fetchImpl: telegramFetch });
  const notifier = createNotifier({ store, logger, api, chatId: cfg.telegram.chatId, timezone: cfg.timezone });
  const scheduler = new Scheduler({
    store,
    client,
    notifier,
    logger,
    defaultIntervalSeconds: cfg.vinted.pollIntervalSeconds,
  });
  const actions = createMonitorActions({ store, scheduler });
  const bot = new TelegramBot({
    api,
    chatId: cfg.telegram.chatId,
    store,
    client,
    notifier,
    actions,
    scheduler,
    logger,
    timezone: cfg.timezone,
    domain: cfg.vinted.domain,
    defaultIntervalSeconds: cfg.vinted.pollIntervalSeconds,
  });
  return { db, store, client, notifier, scheduler, actions, bot, logger };
}

function main() {
  const { errors, warnings } = validateConfig();
  for (const w of warnings) console.warn('⚠️ ', w);
  if (errors.length) {
    for (const e of errors) console.error('❌', e);
    console.error('Revisa el .env (mira el README) y vuelve a arrancar.');
    process.exit(1);
  }
  const ctx = createSniper();
  ctx.logger.info('app', `Vinted Sniper en marcha (Vinted: ${config.vinted.domain})`);
  ctx.scheduler.start();
  ctx.bot.start();

  const shutdown = (signal) => {
    ctx.logger.info('app', `${signal} recibido, cerrando`);
    ctx.scheduler.stop();
    ctx.bot.stop();
    setTimeout(() => {
      ctx.db.close();
      process.exit(0);
    }, 200);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) main();

module.exports = { createSniper };
