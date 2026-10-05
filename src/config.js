'use strict';

const path = require('node:path');

// Load .env if present (Node >= 22). Real environment variables win.
try {
  process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
  // No .env file: rely on the process environment.
}

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n)) throw new Error(`${name} must be an integer (got "${raw}")`);
  return n;
}

function normalizeDomain(raw) {
  return (raw || 'www.vinted.es')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

const config = {
  port: int('PORT', 3000),
  host: process.env.HOST || '0.0.0.0',
  appPassword: process.env.APP_PASSWORD || '',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'sniper.db'),
  timezone: process.env.TZ_NAME || process.env.TZ || 'Europe/Madrid',
  trustProxy: process.env.TRUST_PROXY !== 'false',

  vinted: {
    domain: normalizeDomain(process.env.VINTED_DOMAIN),
    pollIntervalSeconds: int('POLL_INTERVAL_SECONDS', 45),
    userAgent:
      process.env.VINTED_USER_AGENT ||
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
    // Minimum gap between two requests to Vinted, across all monitors.
    minRequestGapMs: int('VINTED_MIN_GAP_MS', 1500),
  },

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  },
};

function validateConfig(cfg = config) {
  const problems = [];
  if (!cfg.appPassword) problems.push('APP_PASSWORD no está definida: nadie podrá iniciar sesión.');
  if (!cfg.vapid.publicKey || !cfg.vapid.privateKey) {
    problems.push('Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY: ejecuta "npm run vapid" y cópialas al .env.');
  }
  if (cfg.vinted.pollIntervalSeconds < 15) {
    problems.push('POLL_INTERVAL_SECONDS < 15 aumenta mucho el riesgo de bloqueo por parte de Vinted.');
  }
  return problems;
}

module.exports = { config, validateConfig, normalizeDomain };
