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

  // Never log or expose the token: it gives full control of the bot.
  telegram: {
    token: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    chatId: (process.env.TELEGRAM_CHAT_ID || '').trim(),
  },
};

function validateConfig(cfg = config) {
  const problems = [];
  if (!cfg.appPassword) problems.push('APP_PASSWORD no está definida: nadie podrá iniciar sesión.');
  if (!cfg.telegram.token || !cfg.telegram.chatId) {
    problems.push('Faltan TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID: no se enviarán avisos (mira el README).');
  } else if (!/^\d+:[\w-]{20,}$/.test(cfg.telegram.token)) {
    problems.push('TELEGRAM_BOT_TOKEN no tiene el formato esperado (123456:ABC...).');
  }
  if (cfg.telegram.chatId && !/^-?\d+$/.test(cfg.telegram.chatId)) {
    problems.push('TELEGRAM_CHAT_ID debe ser un número (por ejemplo 123456789, o -100... para un grupo).');
  }
  if (cfg.vinted.pollIntervalSeconds < 15) {
    problems.push('POLL_INTERVAL_SECONDS < 15 aumenta mucho el riesgo de bloqueo por parte de Vinted.');
  }
  return problems;
}

module.exports = { config, validateConfig, normalizeDomain };
