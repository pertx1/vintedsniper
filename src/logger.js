'use strict';

const MAX_ROWS = 2000;

/**
 * Logs to the console and to the `logs` table so errors are visible from the web UI.
 */
function createLogger(db, { quiet = false } = {}) {
  const insert = db.prepare(
    'INSERT INTO logs (ts, level, source, message, monitor_id) VALUES (?, ?, ?, ?, ?)',
  );
  const prune = db.prepare(
    'DELETE FROM logs WHERE id <= (SELECT id FROM logs ORDER BY id DESC LIMIT 1 OFFSET ?)',
  );
  let writes = 0;

  function log(level, source, message, monitorId = null) {
    const text = message instanceof Error ? message.message : String(message);
    if (!quiet) {
      const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${source}: ${text}`;
      (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
    }
    try {
      insert.run(Date.now(), level, source, text, monitorId);
      if (++writes % 100 === 0) prune.run(MAX_ROWS);
    } catch (err) {
      console.error('No se pudo escribir el log en la base de datos:', err.message);
    }
  }

  return {
    info: (source, msg, monitorId) => log('info', source, msg, monitorId),
    warn: (source, msg, monitorId) => log('warn', source, msg, monitorId),
    error: (source, msg, monitorId) => log('error', source, msg, monitorId),
  };
}

module.exports = { createLogger };
