'use strict';

const { normalizeText } = require('./filters');
const { validateMonitor } = require('./validation');

// Fields that change the query sent to Vinted. Changing any of them means the
// next pass must re-learn the current results instead of notifying all of them.
const QUERY_FIELDS = ['search_text', 'catalog_ids', 'brand_ids', 'size_ids', 'status_ids', 'extra_params', 'price_from', 'price_to'];

/**
 * Monitor operations used by the Telegram bot.
 */
function createMonitorActions({ store, scheduler }) {
  /** Creates an already-validated monitor and schedules its first (silent) pass. */
  function create(data) {
    const m = store.createMonitor(data);
    scheduler.sync(m.id);
    return store.getMonitor(m.id);
  }

  /**
   * Applies a partial change, validating the resulting monitor.
   * Returns { monitor, reprimed } or { errors }.
   */
  function update(id, changes) {
    const current = store.getMonitor(id);
    if (!current) return { errors: ['Ese monitor ya no existe'] };
    const { data, errors } = validateMonitor({ ...current, ...changes });
    if (errors.length) return { errors };
    const reprimed = QUERY_FIELDS.some((f) => JSON.stringify(data[f]) !== JSON.stringify(current[f]));
    store.updateMonitor(id, data);
    if (reprimed) {
      store.patchMonitorState(id, { primed: false, failures: 0, status: data.enabled ? 'pending' : 'paused', status_message: '' });
      scheduler.sync(id);
    }
    return { monitor: store.getMonitor(id), reprimed };
  }

  function remove(id) {
    const ok = store.deleteMonitor(id);
    scheduler.sync(id);
    return ok;
  }

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

  return { create, update, remove, setEnabled, setAllEnabled, findByName };
}

module.exports = { createMonitorActions };
