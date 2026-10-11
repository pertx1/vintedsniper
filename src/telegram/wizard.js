'use strict';

/**
 * Conversations in the chat:
 *  - create: paste a Vinted URL -> name -> max price -> min price -> excluded words
 *            -> (description?) -> confirm
 *  - edit:   pick a field of an existing monitor -> type the new value
 *
 * There is a single authorized chat, so a single pending conversation is kept
 * in memory. It expires after 30 minutes without answers.
 */

const { parseVintedUrl } = require('../vinted/url-parser');
const { validateMonitor, optNumber, wordList } = require('../monitor/validation');
const { normalizeText } = require('../monitor/filters');
const { escapeHtml: esc } = require('./notifier');
const { filterLines, eur, monitorCard } = require('./views');

const TTL_MS = 30 * 60_000;
const NONE_WORDS = new Set(['-', 'no', 'ninguna', 'ninguno', 'nada', '0', 'sin']);
const VINTED_URL = /https?:\/\/[^\s]*vinted\.[a-z.]+\/[^\s]*/i;

function findVintedUrl(text) {
  const m = VINTED_URL.exec(String(text || ''));
  return m ? m[0] : null;
}

function createWizard({ store, actions, domain, now = Date.now, clock }) {
  let pending = null;

  function active() {
    if (pending && now() - pending.at > TTL_MS) pending = null;
    return pending;
  }
  function set(p) {
    pending = { ...p, at: now() };
  }
  function cancel() {
    const had = !!active();
    pending = null;
    return had;
  }

  function nameTaken(name, exceptId = null) {
    const n = normalizeText(name);
    return store.listMonitors().some((m) => m.id !== exceptId && normalizeText(m.name) === n);
  }

  // ------------------------------------------------------------ create

  function start(url) {
    let parsed;
    try {
      parsed = parseVintedUrl(url);
    } catch (err) {
      return { text: `❌ ${esc(err.message)}. Copia el enlace de una búsqueda de Vinted (con los filtros aplicados).` };
    }
    const draft = {
      search_text: parsed.search_text,
      catalog_ids: parsed.catalog_ids,
      brand_ids: parsed.brand_ids,
      size_ids: parsed.size_ids,
      status_ids: parsed.status_ids,
      extra_params: parsed.extra_params,
      price_from: parsed.price_from,
      price_to: parsed.price_to,
      source_url: parsed.source_url,
      exclude_words: [],
      check_description: false,
    };
    if (!draft.search_text && !draft.catalog_ids.length && !draft.brand_ids.length) {
      return { text: '❌ Esa URL no tiene ningún filtro (ni texto, ni categoría, ni marca). Aplica los filtros en Vinted y vuelve a copiar el enlace.' };
    }
    set({ type: 'create', step: 'name', draft, urlPrice: { from: parsed.price_from, to: parsed.price_to } });
    const lines = ['🆕 <b>Nuevo monitor</b>', '', ...filterLines(draft)];
    if (parsed.domain !== domain) {
      lines.push('', `⚠️ La URL es de ${esc(parsed.domain)}, pero se consultará ${esc(domain)}.`);
    }
    const ask = askStep();
    return { text: `${lines.join('\n')}\n\n${ask.text}`, markup: ask.markup };
  }

  /** Question for the current create step. */
  function askStep() {
    const { step, draft, urlPrice } = pending;
    const btn = (text, value) => ({ text, callback_data: `w:${step}:${value}` });
    switch (step) {
      case 'name':
        return {
          text: '1/4 · ¿Qué <b>nombre</b> le pongo?',
          markup: draft.search_text ? { inline_keyboard: [[btn(`Usar «${draft.search_text.slice(0, 40)}»`, 'default')]] } : undefined,
        };
      case 'price_to':
        return {
          text: '2/4 · <b>Precio máximo</b> en euros (obligatorio). Ejemplo: <code>80</code>',
          markup: urlPrice.to != null ? { inline_keyboard: [[btn(`Usar ${eur(urlPrice.to)} (de la URL)`, 'default')]] } : undefined,
        };
      case 'price_from':
        return {
          text: '3/4 · <b>Precio mínimo</b> (opcional, ayuda a evitar falsificaciones). Ejemplo: <code>25</code>',
          markup: {
            inline_keyboard: [[
              btn('Sin mínimo', 'none'),
              ...(urlPrice.from != null && urlPrice.from < draft.price_to ? [btn(`Usar ${eur(urlPrice.from)}`, 'default')] : []),
            ]],
          },
        };
      case 'exclude_words':
        return {
          text: '4/4 · <b>Palabras excluidas</b>, separadas por comas. Si el título las contiene, se descarta. Ejemplo: <code>réplica, fake, caja</code>',
          markup: { inline_keyboard: [[btn('Ninguna', 'none')]] },
        };
      case 'check_description':
        return {
          text: '¿Busco esas palabras también en la <b>descripción</b>? (1 petición extra a Vinted por artículo nuevo)',
          markup: { inline_keyboard: [[btn('Sí', 'yes'), btn('No, solo el título', 'no')]] },
        };
      case 'confirm':
        return {
          text: [
            '✅ <b>Resumen</b>',
            '',
            `🎯 ${esc(draft.name)}`,
            `💶 ${draft.price_from != null ? `${eur(draft.price_from)} – ${eur(draft.price_to)}` : `máx. ${eur(draft.price_to)}`}`,
            ...filterLines(draft),
            `🚫 Excluidas: ${draft.exclude_words.length ? esc(draft.exclude_words.join(', ')) : 'ninguna'}${draft.check_description ? ' (título y descripción)' : ''}`,
            '',
            'La primera comprobación marcará lo que ya existe como visto: solo te avisaré de lo nuevo.',
          ].join('\n'),
          markup: { inline_keyboard: [[btn('✅ Crear', 'yes'), btn('❌ Cancelar', 'no')]] },
        };
      default:
        return { text: '' };
    }
  }

  function next(step) {
    pending.step = step;
    pending.at = now();
    return askStep();
  }

  /** Applies an answer (typed text, or a button value) to the current create step. */
  function answerCreate(value, { button = false } = {}) {
    const { step, draft, urlPrice } = pending;
    const err = (text) => {
      const again = askStep();
      return { text: `❌ ${text}\n\n${again.text}`, markup: again.markup };
    };
    switch (step) {
      case 'name': {
        const name = (button ? draft.search_text : value).trim().slice(0, 80);
        if (!name) return err('El nombre no puede estar vacío.');
        if (nameTaken(name)) return err(`Ya hay un monitor llamado «${esc(name)}». Elige otro nombre.`);
        draft.name = name;
        return next('price_to');
      }
      case 'price_to': {
        const n = button ? urlPrice.to : optNumber(value);
        if (n == null || Number.isNaN(n) || n <= 0) return err('Escribe un número mayor que 0, por ejemplo <code>80</code>.');
        draft.price_to = n;
        if (draft.price_from != null && draft.price_from >= n) draft.price_from = null;
        return next('price_from');
      }
      case 'price_from': {
        let n;
        if (button) n = value === 'none' ? null : urlPrice.from;
        else n = NONE_WORDS.has(value.trim().toLowerCase()) ? null : optNumber(value);
        if (Number.isNaN(n) || (n != null && n < 0)) return err('Escribe un número, por ejemplo <code>25</code>, o pulsa «Sin mínimo».');
        if (n != null && n >= draft.price_to) return err(`El mínimo debe ser menor que el máximo (${eur(draft.price_to)}).`);
        draft.price_from = n;
        return next('exclude_words');
      }
      case 'exclude_words': {
        const words = button || NONE_WORDS.has(value.trim().toLowerCase()) ? [] : wordList(value);
        draft.exclude_words = words;
        return next(words.length ? 'check_description' : 'confirm');
      }
      case 'check_description': {
        if (!button) {
          const v = normalizeText(value);
          if (!['si', 'no'].includes(v)) return err('Responde «sí» o «no».');
          value = v === 'si' ? 'yes' : 'no';
        }
        draft.check_description = value === 'yes';
        return next('confirm');
      }
      case 'confirm': {
        if (!button) {
          const v = normalizeText(value);
          if (!['si', 'crear', 'ok'].includes(v)) return err('Pulsa «Crear» o escribe /cancelar.');
          value = 'yes';
        }
        if (value !== 'yes') {
          pending = null;
          return { text: 'Cancelado. No se ha creado nada.' };
        }
        const { data, errors } = validateMonitor({ ...draft, enabled: true });
        if (errors.length) return err(esc(errors.join('. ')));
        pending = null;
        const m = actions.create(data);
        const card = monitorCard(m, clock);
        return { text: `✅ Monitor creado. En unos segundos hará la primera pasada.\n\n${card.text}`, markup: card.markup };
      }
      default:
        pending = null;
        return { text: 'Algo se ha perdido por el camino. Vuelve a empezar pegando la URL.' };
    }
  }

  // ------------------------------------------------------------ edit

  const FIELD_PROMPTS = {
    name: 'Escribe el nuevo <b>nombre</b>:',
    price_to: 'Escribe el nuevo <b>precio máximo</b> en euros:',
    price_from: 'Escribe el nuevo <b>precio mínimo</b> en euros, o <code>no</code> para quitarlo:',
    exclude_words: 'Escribe las <b>palabras excluidas</b> separadas por comas (sustituyen a las actuales), o <code>ninguna</code>:',
    url: 'Pega la nueva <b>URL de búsqueda de Vinted</b>. Sustituye los filtros de Vinted (y el precio, si la URL lo trae); se mantienen el nombre y las palabras excluidas:',
  };

  /** Starts editing a field. check_description toggles immediately. */
  function startEdit(id, field) {
    const m = store.getMonitor(id);
    if (!m) return { text: 'Ese monitor ya no existe.' };
    if (field === 'check_description') {
      const updated = actions.update(id, { check_description: !m.check_description });
      const card = monitorCard(updated.monitor, clock);
      return { text: `✅ Descripción: ${updated.monitor.check_description ? 'sí' : 'no'}.\n\n${card.text}`, markup: card.markup };
    }
    if (!FIELD_PROMPTS[field]) return { text: 'Campo desconocido.' };
    set({ type: 'edit', id, field });
    const current = {
      name: esc(m.name),
      price_to: eur(m.price_to),
      price_from: m.price_from != null ? eur(m.price_from) : 'sin mínimo',
      exclude_words: m.exclude_words.length ? esc(m.exclude_words.join(', ')) : 'ninguna',
      url: m.source_url ? 'la búsqueda actual' : 'sin URL guardada',
    }[field];
    return { text: `✏️ «${esc(m.name)}» · actual: ${current}\n${FIELD_PROMPTS[field]}\n\n(/cancelar para dejarlo como está)` };
  }

  function answerEdit(value) {
    const { id, field } = pending;
    const m = store.getMonitor(id);
    if (!m) {
      pending = null;
      return { text: 'Ese monitor ya no existe.' };
    }
    const retry = (text) => ({ text: `❌ ${text}\n${FIELD_PROMPTS[field]}` });
    let changes;
    const v = value.trim();
    switch (field) {
      case 'name':
        if (!v) return retry('El nombre no puede estar vacío.');
        if (nameTaken(v, id)) return retry(`Ya hay otro monitor llamado «${esc(v)}».`);
        changes = { name: v };
        break;
      case 'price_to':
        changes = { price_to: optNumber(v) };
        break;
      case 'price_from':
        changes = { price_from: NONE_WORDS.has(v.toLowerCase()) ? null : optNumber(v) };
        break;
      case 'exclude_words':
        changes = { exclude_words: NONE_WORDS.has(v.toLowerCase()) ? [] : wordList(v) };
        break;
      case 'url': {
        const url = findVintedUrl(v);
        if (!url) return retry('No veo ninguna URL de Vinted en el mensaje.');
        let p;
        try {
          p = parseVintedUrl(url);
        } catch (err) {
          return retry(esc(err.message));
        }
        changes = {
          search_text: p.search_text,
          catalog_ids: p.catalog_ids,
          brand_ids: p.brand_ids,
          size_ids: p.size_ids,
          status_ids: p.status_ids,
          extra_params: p.extra_params,
          source_url: p.source_url,
          ...(p.price_to != null ? { price_to: p.price_to } : {}),
          ...(p.price_from != null ? { price_from: p.price_from } : {}),
        };
        break;
      }
      default:
        pending = null;
        return { text: 'Campo desconocido.' };
    }
    const res = actions.update(id, changes);
    if (res.errors) return retry(esc(res.errors.join('. ')));
    pending = null;
    const card = monitorCard(res.monitor, clock);
    const note = res.reprimed ? '\nComo cambia la búsqueda en Vinted, la próxima pasada volverá a marcar lo existente como visto.' : '';
    return { text: `✅ Guardado.${note}\n\n${card.text}`, markup: card.markup };
  }

  // ------------------------------------------------------------ entry points

  /** Free text from the user while a conversation is open. */
  function handleText(text) {
    const p = active();
    if (!p) return null;
    p.at = now();
    return p.type === 'create' ? answerCreate(text) : answerEdit(text);
  }

  /** Button press "w:<step>:<value>" for the create conversation. */
  function handleButton(step, value) {
    const p = active();
    if (!p || p.type !== 'create' || p.step !== step) {
      return { text: 'Ese paso ya no está activo. Pega la URL de nuevo para empezar.' };
    }
    return answerCreate(value, { button: true });
  }

  return { start, startEdit, handleText, handleButton, cancel, active: () => active() };
}

module.exports = { createWizard, findVintedUrl };
