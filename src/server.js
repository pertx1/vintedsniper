'use strict';

const path = require('node:path');
const express = require('express');

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
const { createAuth } = require('./api/auth');
const { createApiRouter } = require('./api/routes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createApp({ cfg = config, db, fetchImpl, telegramFetch, quietLogs = false } = {}) {
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
  const tg = cfg.telegram;
  const api = tg.token ? createTelegramApi({ token: tg.token, fetchImpl: telegramFetch }) : null;
  const notifier = createNotifier({ store, logger, api, chatId: tg.chatId, timezone: cfg.timezone });
  const scheduler = new Scheduler({
    store,
    client,
    notifier,
    logger,
    defaultIntervalSeconds: cfg.vinted.pollIntervalSeconds,
  });
  const actions = createMonitorActions({ store, scheduler });
  const bot = notifier.configured
    ? new TelegramBot({ api, chatId: tg.chatId, store, client, notifier, actions, logger, timezone: cfg.timezone })
    : null;
  const auth = createAuth({ db, password: cfg.appPassword });

  const app = express();
  app.disable('x-powered-by');
  if (cfg.trustProxy) app.set('trust proxy', 'loopback, linklocal, uniquelocal');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  app.use('/api', createApiRouter({ store, db, auth, scheduler, actions, client, notifier, bot, config: cfg }));

  app.use(
    express.static(PUBLIC_DIR, {
      setHeaders(res, file) {
        if (file.endsWith('.webmanifest') || file.endsWith('manifest.json')) {
          res.setHeader('Content-Type', 'application/manifest+json');
        }
        res.setHeader('Cache-Control', /\/icons\//.test(file) ? 'public, max-age=604800' : 'no-cache');
      },
    }),
  );

  return { app, db, store, client, notifier, bot, actions, scheduler, logger };
}

function main() {
  for (const problem of validateConfig()) console.warn('⚠️ ', problem);
  const ctx = createApp();
  const server = ctx.app.listen(config.port, config.host, () => {
    ctx.logger.info('server', `Vinted Sniper escuchando en http://${config.host}:${config.port} (Vinted: ${config.vinted.domain})`);
  });
  ctx.scheduler.start();
  if (ctx.bot) ctx.bot.start();

  const shutdown = (signal) => {
    ctx.logger.info('server', `${signal} recibido, cerrando`);
    ctx.scheduler.stop();
    ctx.bot?.stop();
    server.close(() => {
      ctx.db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

if (require.main === module) main();

module.exports = { createApp };
