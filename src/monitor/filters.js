'use strict';

/**
 * Local filters applied on top of what the Vinted API already filters.
 */

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Returns the excluded word found in the text, or null.
 * Matching is accent/case-insensitive and on whole words, so "rep" does not
 * match "repasado" but "replica" matches "Réplica". Multi-word entries
 * ("no original") match as a phrase.
 */
function findExcludedWord(text, words) {
  if (!words || !words.length) return null;
  const haystack = ` ${normalizeText(text)} `;
  for (const word of words) {
    const needle = normalizeText(word);
    if (needle && haystack.includes(` ${needle} `)) return word;
  }
  return null;
}

/**
 * Checks an item against a monitor. Returns { ok: true } or { ok: false, reason }.
 * Description is checked separately (it needs an extra request).
 */
function checkItem(item, monitor, { maxAgeHours = 0, now = Date.now() } = {}) {
  if (item.price != null) {
    if (monitor.price_to != null && item.price > monitor.price_to) {
      return { ok: false, reason: `precio ${item.price} > máximo ${monitor.price_to}` };
    }
    if (monitor.price_from != null && item.price < monitor.price_from) {
      return { ok: false, reason: `precio ${item.price} < mínimo ${monitor.price_from}` };
    }
  }
  const word = findExcludedWord(`${item.title} ${item.brand}`, monitor.exclude_words);
  if (word) return { ok: false, reason: `contiene "${word}"` };

  if (maxAgeHours > 0 && item.publishedAt && now - item.publishedAt > maxAgeHours * 3600_000) {
    // Old items that show up as "new" are usually bumped/promoted listings.
    return { ok: false, reason: 'publicado hace demasiado tiempo' };
  }
  return { ok: true };
}

module.exports = { normalizeText, findExcludedWord, checkItem };
