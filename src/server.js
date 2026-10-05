'use strict';

const path = require('node:path');
const express = require('express');

const { config, validateConfig } = require('./config');
const { openDatabase } = require('./db');
const { createLogger } = require('./logger');
const { createStore } = require('./store');
const { VintedClient } = require('./vinted/client');
const { createPush } = require('./push/push');
const { Scheduler } = require('./monitor/scheduler');
const { createAuth } = require('./api/auth');
const { createApiRouter } = require('./api/routes');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function createApp({ cfg = config, db, fetchImpl, pushSender, quietLogs = false } = {}) {
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
  const push = createPush({ store, logger, vapid: cfg.vapid, timezone: cfg.timezone, sender: pushSender });
  const scheduler = new Scheduler({
    store,
    client,
    push,
    logger,
    defaultIntervalSeconds: cfg.vinted.pollIntervalSeconds,
  });
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

  app.use('/api', createApiRouter({ store, db, auth, scheduler, client, push, config: cfg }));

  // The service worker must never be cached, or updates would not reach the phone.
  app.get('/sw.js', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Service-Worker-Allowed', '/');
    res.sendFile(path.join(PUBLIC_DIR, 'sw.js'));
  });
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

  return { app, db, store, client, push, scheduler, logger };
}

function main() {
  for (const problem of validateConfig()) console.warn('⚠️ ', problem);
  const ctx = createApp();
  const server = ctx.app.listen(config.port, config.host, () => {
    ctx.logger.info('server', `Vinted Sniper escuchando en http://${config.host}:${config.port} (Vinted: ${config.vinted.domain})`);
  });
  ctx.scheduler.start();

  const shutdown = (signal) => {
    ctx.logger.info('server', `${signal} recibido, cerrando`);
    ctx.scheduler.stop();
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
