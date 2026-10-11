'use strict';

const { normalizeText } = require('./filters');

/**
 * Monitor operations shared by the web API and the Telegram bot.
 */
function createMonitorActions({ store, scheduler }) {
  /**
   * Pauses or resumes a monitor. Resuming resets `primed`, so the next pass only
   * learns what is already listed and never floods you with old items.
   */
  function setEnabled(id, enabled) {
    store.updateMonitor(id, { enabled });
    if (enabled) {
      store.patchMonitorState(id, { primed: false, failures: 0, status: 'pending', status_message: 'Reactivado' });
    }
    scheduler.sync(id);
    return store.getMonitor(id);
  }

  /** Changes every monitor that is not already in the wanted state. Returns the changed ones. */
  function setAllEnabled(enabled) {
    return store
      .listMonitors()
      .filter((m) => m.enabled !== enabled)
      .map((m) => setEnabled(m.id, enabled));
  }

  /**
   * Finds monitors by "#id", id, exact name or unique partial name
   * (case and accent-insensitive). Returns { match } or { candidates } (0 or >1).
   */
  function findByName(query) {
    const monitors = store.listMonitors();
    const q = String(query || '').trim().replace(/^#/, '');
    if (!q) return { candidates: [] };
    if (/^\d+$/.test(q)) {
      const byId = monitors.find((m) => m.id === Number(q));
      if (byId) return { match: byId };
    }
    const nq = normalizeText(q);
    const exact = monitors.filter((m) => normalizeText(m.name) === nq);
    if (exact.length === 1) return { match: exact[0] };
    if (exact.length > 1) return { candidates: exact };
    const partial = monitors.filter((m) => normalizeText(m.name).includes(nq));
    if (partial.length === 1) return { match: partial[0] };
    return { candidates: partial };
  }

  return { setEnabled, setAllEnabled, findByName };
}

module.exports = { createMonitorActions };
