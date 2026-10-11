'use strict';

const { toMinutes } = require('../telegram/quiet-hours');

function intList(v) {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(/[\s,;]+/);
  const out = [];
  for (const x of arr) {
    const n = Number.parseInt(x, 10);
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

function wordList(v) {
  if (v == null || v === '') return [];
  const arr = Array.isArray(v) ? v : String(v).split(/[\n,;]+/);
  return [...new Set(arr.map((w) => String(w).trim()).filter(Boolean))].slice(0, 100);
}

/** Parses "45", "45,5", "45.5 €" -> number; '' -> null; garbage -> NaN. */
function optNumber(v) {
  if (v == null || v === '') return null;
  const n = Number.parseFloat(String(v).replace(/[€\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/** Validates and normalizes a full monitor. Returns { data, errors }. */
function validateMonitor(input) {
  const errors = [];
  const b = input || {};
  const data = {};

  data.name = String(b.name || '').trim().slice(0, 80);
  if (!data.name) errors.push('El nombre es obligatorio');

  data.search_text = String(b.search_text || '').trim().slice(0, 200);
  data.kind = 'custom';
  data.catalog_ids = intList(b.catalog_ids);
  data.brand_ids = intList(b.brand_ids);
  data.size_ids = intList(b.size_ids);
  data.status_ids = intList(b.status_ids);
  data.extra_params = b.extra_params && typeof b.extra_params === 'object' && !Array.isArray(b.extra_params)
    ? b.extra_params
    : {};

  data.price_to = optNumber(b.price_to);
  if (data.price_to == null || Number.isNaN(data.price_to) || data.price_to <= 0) {
    errors.push('El precio máximo es obligatorio y debe ser mayor que 0');
  }
  data.price_from = optNumber(b.price_from);
  if (Number.isNaN(data.price_from) || data.price_from < 0) errors.push('El precio mínimo no es válido');
  else if (data.price_from != null && data.price_to > 0 && data.price_from >= data.price_to) {
    errors.push('El precio mínimo debe ser menor que el máximo');
  }

  data.exclude_words = wordList(b.exclude_words);
  data.check_description = !!b.check_description;
  data.source_url = String(b.source_url || '').slice(0, 2000);
  data.enabled = b.enabled === undefined ? true : !!b.enabled;

  if (!data.search_text && !data.catalog_ids.length && !data.brand_ids.length) {
    errors.push('La búsqueda necesita al menos un texto, una categoría o una marca');
  }
  return { data, errors };
}

/** Validates a partial settings update. Returns { data, errors }. */
function validateSettings(input) {
  const b = input || {};
  const out = {};
  const errors = [];
  if ('poll_interval_seconds' in b) {
    if (b.poll_interval_seconds === null || b.poll_interval_seconds === '') out.poll_interval_seconds = null;
    else {
      const n = Number.parseInt(b.poll_interval_seconds, 10);
      if (!Number.isFinite(n) || n < 15 || n > 3600) errors.push('El intervalo debe estar entre 15 y 3600 segundos');
      else out.poll_interval_seconds = n;
    }
  }
  for (const k of ['notifications_enabled', 'quiet_enabled']) {
    if (k in b) out[k] = !!b[k];
  }
  for (const k of ['quiet_start', 'quiet_end']) {
    if (k in b) {
      if (toMinutes(b[k]) == null) errors.push(`Hora no válida: ${b[k]}`);
      else out[k] = b[k];
    }
  }
  if ('max_item_age_hours' in b) {
    const n = Number.parseInt(b.max_item_age_hours, 10);
    if (!Number.isFinite(n) || n < 0 || n > 24 * 30) errors.push('La antigüedad máxima debe estar entre 0 y 720 horas');
    else out.max_item_age_hours = n;
  }
  return { data: out, errors };
}

module.exports = { validateMonitor, validateSettings, optNumber, wordList, intList };
