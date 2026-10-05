'use strict';

const crypto = require('node:crypto');

const COOKIE_NAME = 'vs_session';
const SESSION_DAYS = 180;
const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60_000;

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Single-password login. Sessions are random tokens stored in SQLite and sent
 * in an HttpOnly cookie (the iOS home-screen app keeps its own cookie jar, so
 * you log in once inside the installed app).
 */
function createAuth({ db, password }) {
  const failures = new Map(); // ip -> { count, first }
  const getSession = db.prepare('SELECT * FROM sessions WHERE token = ? AND expires_at > ?');
  const insertSession = db.prepare(
    'INSERT INTO sessions (token, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?)',
  );
  const deleteSession = db.prepare('DELETE FROM sessions WHERE token = ?');

  function cookieOptions(req, maxAgeSeconds) {
    const parts = [`Path=/`, `HttpOnly`, `SameSite=Lax`, `Max-Age=${maxAgeSeconds}`];
    if (req.secure) parts.push('Secure');
    return parts.join('; ');
  }

  function isAuthenticated(req) {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    return !!(token && getSession.get(token, Date.now()));
  }

  function tooManyFailures(ip) {
    const f = failures.get(ip);
    if (!f) return false;
    if (Date.now() - f.first > FAILURE_WINDOW_MS) {
      failures.delete(ip);
      return false;
    }
    return f.count >= MAX_FAILURES;
  }

  function login(req, res) {
    const ip = req.ip;
    if (tooManyFailures(ip)) {
      return res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    }
    const given = req.body?.password;
    if (!password || typeof given !== 'string' || !safeEqual(given, password)) {
      const f = failures.get(ip) || { count: 0, first: Date.now() };
      f.count++;
      failures.set(ip, f);
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    failures.delete(ip);
    const token = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    insertSession.run(token, now, now + SESSION_DAYS * 86400_000, String(req.headers['user-agent'] || '').slice(0, 300));
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; ${cookieOptions(req, SESSION_DAYS * 86400)}`);
    return res.json({ ok: true });
  }

  function logout(req, res) {
    const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (token) deleteSession.run(token);
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; ${cookieOptions(req, 0)}`);
    res.json({ ok: true });
  }

  function requireAuth(req, res, next) {
    if (isAuthenticated(req)) return next();
    res.status(401).json({ error: 'No autenticado' });
  }

  return { login, logout, requireAuth, isAuthenticated };
}

module.exports = { createAuth, parseCookies };
