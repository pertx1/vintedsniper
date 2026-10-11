'use strict';

/**
 * Text and inline keyboards the bot sends. All user-provided text is HTML-escaped.
 */

const { escapeHtml, formatPrice } = require('./notifier');
const { CONDITIONS } = require('../vinted/conditions');

const STATUS_ICON = { ok: '🟢', limited: '🟠', error: '🔴', pending: '🔵', paused: '⏸' };
const STATUS_TEXT = { ok: 'OK', limited: 'limitado', error: 'error', pending: 'pendiente', paused: 'pausado' };

const COMMANDS = [
  { command: 'nuevo', description: 'Crear un monitor (o pega una URL de Vinted)' },
  { command: 'monitores', description: 'Lista de monitores' },
  { command: 'estado', description: 'Estado de cada monitor y última comprobación' },
  { command: 'encontrados', description: 'Últimos artículos encontrados' },
  { command: 'ver', description: 'Ficha de un monitor: /ver <nombre>' },
  { command: 'editar', description: 'Editar un monitor: /editar <nombre>' },
  { command: 'borrar', description: 'Borrar un monitor: /borrar <nombre>' },
  { command: 'pausar', description: 'Pausar un monitor: /pausar <nombre>' },
  { command: 'reanudar', description: 'Reanudar un monitor: /reanudar <nombre>' },
  { command: 'pausartodo', description: 'Pausar todos los monitores' },
  { command: 'reanudartodo', description: 'Reanudar todos los monitores' },
  { command: 'ajustes', description: 'Avisos, horario silencioso e intervalo' },
  { command: 'registro', description: 'Últimos avisos y errores del sistema' },
  { command: 'test', description: 'Enviar un aviso de prueba' },
  { command: 'cancelar', description: 'Cancelar lo que estés creando o editando' },
  { command: 'ayuda', description: 'Lista de comandos' },
];

const esc = escapeHtml;
const eur = (n) => formatPrice(n, 'EUR');

function makeClock(timezone, now) {
  const time = new Intl.DateTimeFormat('es-ES', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const day = new Intl.DateTimeFormat('es-ES', { timeZone: timezone, day: '2-digit', month: '2-digit' });
  return (ts) => {
    if (!ts) return '—';
    return day.format(ts) === day.format(now()) ? time.format(ts) : `${day.format(ts)} ${time.format(ts)}`;
  };
}

function ago(ts, now) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return 'hace un momento';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function priceRange(m) {
  return m.price_from != null ? `${eur(m.price_from)} – ${eur(m.price_to)}` : `máx. ${eur(m.price_to)}`;
}

function conditionLabels(ids) {
  return ids.map((id) => CONDITIONS.find((c) => c.id === id)?.label || `#${id}`).join(', ');
}

/** Lines describing the Vinted filters of a monitor or draft. */
function filterLines(d) {
  const lines = [];
  if (d.search_text) lines.push(`🔎 Búsqueda: «${esc(d.search_text)}»`);
  if (d.catalog_ids?.length) lines.push(`📂 Categorías: ${d.catalog_ids.length}`);
  if (d.brand_ids?.length) lines.push(`🏷 Marcas: ${d.brand_ids.length}`);
  if (d.size_ids?.length) lines.push(`📏 Tallas: ${d.size_ids.length}`);
  if (d.status_ids?.length) lines.push(`✨ Estado: ${esc(conditionLabels(d.status_ids))}`);
  const extra = Object.keys(d.extra_params || {});
  if (extra.length) lines.push(`➕ Otros filtros: ${esc(extra.join(', '))}`);
  return lines;
}

function helpText() {
  return [
    '🎯 <b>Vinted Sniper</b>',
    '',
    'Para crear un monitor, configura la búsqueda en la web o la app de Vinted, copia el enlace y <b>pégalo aquí</b>.',
    '',
    ...COMMANDS.map((c) => `/${c.command} — ${esc(c.description)}`),
  ].join('\n');
}

function statusText({ monitors, vinted, counts, settings, quietNow, clock }) {
  const lines = [
    '📊 <b>Estado</b>',
    vinted.blocked
      ? `Vinted: ⚠️ limitado (HTTP ${vinted.lastBlockStatus}) hasta ${clock(vinted.blockedUntil)}`
      : 'Vinted: ✅ normal',
    `Encontrados 24 h: ${counts.found24h}`,
    `Avisos: ${settings.notifications_enabled ? 'activados' : '⛔ desactivados'}` +
      (settings.quiet_enabled ? ` · silencio ${settings.quiet_start}–${settings.quiet_end}${quietNow ? ' (ahora)' : ''}` : ''),
    '',
  ];
  if (!monitors.length) lines.push('No hay monitores. Pega una URL de Vinted para crear uno.');
  for (const m of monitors) {
    const st = m.enabled ? m.status : 'paused';
    lines.push(`${STATUS_ICON[st] || '•'} <b>${esc(m.name)}</b> — ${STATUS_TEXT[st] || st} · ${clock(m.last_check_at)}`);
    if (m.enabled && (st === 'error' || st === 'limited') && m.status_message) {
      lines.push(`   <i>${esc(m.status_message)}</i>`);
    }
  }
  return lines.join('\n');
}

function monitorsList(monitors) {
  if (!monitors.length) return { text: 'No hay monitores. Pega aquí una URL de búsqueda de Vinted para crear el primero.' };
  const text = [
    `🎯 <b>Monitores (${monitors.length})</b>`,
    ...monitors.map((m) => `#${m.id} <b>${esc(m.name)}</b> — ${esc(priceRange(m))}${m.enabled ? '' : ' · ⏸ pausado'}`),
    '',
    'Toca uno para ver su ficha:',
  ].join('\n');
  const rows = monitors.map((m) => [{ text: `${m.enabled ? '' : '⏸ '}${m.name}`.slice(0, 60), callback_data: `mon:${m.id}` }]);
  return { text, markup: { inline_keyboard: rows } };
}

function monitorCard(m, clock) {
  const st = m.enabled ? m.status : 'paused';
  const lines = [
    `🎯 <b>${esc(m.name)}</b>  <i>#${m.id}</i>`,
    `${STATUS_ICON[st] || '•'} ${STATUS_TEXT[st] || st} · última comprobación ${clock(m.last_check_at)}`,
    m.status_message ? `<i>${esc(m.status_message)}</i>` : null,
    '',
    `💶 Precio: ${esc(priceRange(m))}`,
    ...filterLines(m),
    `🚫 Excluidas: ${m.exclude_words.length ? esc(m.exclude_words.join(', ')) : 'ninguna'}${m.check_description ? ' (título y descripción)' : ''}`,
  ].filter((l) => l !== null);
  if (m.source_url) lines.push(`🔗 <a href="${esc(m.source_url)}">Abrir la búsqueda en Vinted</a>`);
  const markup = {
    inline_keyboard: [
      [
        m.enabled ? { text: '⏸ Pausar', callback_data: `pause:${m.id}` } : { text: '▶️ Reanudar', callback_data: `resume:${m.id}` },
        { text: '🔄 Comprobar', callback_data: `run:${m.id}` },
      ],
      [
        { text: '✏️ Editar', callback_data: `edit:${m.id}` },
        { text: '⭐ Encontrados', callback_data: `found:${m.id}` },
        { text: '🗑 Borrar', callback_data: `del:${m.id}` },
      ],
    ],
  };
  return { text: lines.join('\n'), markup };
}

function editMenu(m) {
  return {
    text: `✏️ <b>Editar «${esc(m.name)}»</b>\n¿Qué quieres cambiar?`,
    markup: {
      inline_keyboard: [
        [{ text: 'Nombre', callback_data: `ef:name:${m.id}` }, { text: 'Precio máximo', callback_data: `ef:price_to:${m.id}` }],
        [{ text: 'Precio mínimo', callback_data: `ef:price_from:${m.id}` }, { text: 'Palabras excluidas', callback_data: `ef:exclude_words:${m.id}` }],
        [
          { text: m.check_description ? 'Descripción: sí → no' : 'Descripción: no → sí', callback_data: `ef:check_description:${m.id}` },
          { text: 'Cambiar URL', callback_data: `ef:url:${m.id}` },
        ],
        [{ text: '« Volver', callback_data: `mon:${m.id}` }],
      ],
    },
  };
}

function foundText(rows, { monitorName = null, now }) {
  if (!rows.length) {
    return monitorName ? `Aún no se ha encontrado nada para «${esc(monitorName)}».` : 'Aún no se ha encontrado nada.';
  }
  return [
    monitorName ? `⭐ <b>Últimos encontrados · ${esc(monitorName)}</b>` : '⭐ <b>Últimos encontrados</b>',
    '',
    ...rows.map((f) => {
      const title = [f.brand, f.title].filter(Boolean).join(' · ');
      const details = [formatPrice(f.price, f.currency), f.size && `T. ${f.size}`, ago(f.published_at || f.found_at, now)]
        .filter(Boolean)
        .join(' · ');
      const mons = monitorName ? '' : ` <i>(${esc(f.monitors.map((m) => m.name).join(', '))})</i>`;
      return `• <a href="${esc(f.url)}">${esc(title.slice(0, 80))}</a>\n   ${esc(details)}${mons}`;
    }),
  ].join('\n');
}

function settingsText({ settings, defaultInterval, intervalSeconds, timezone }) {
  return [
    '⚙️ <b>Ajustes</b>',
    '',
    `🔔 Avisos: ${settings.notifications_enabled ? 'activados' : '⛔ desactivados'}`,
    '   /avisos on · /avisos off',
    `🌙 Horario silencioso (avisos sin sonido): ${settings.quiet_enabled ? `${settings.quiet_start}–${settings.quiet_end}` : 'desactivado'}`,
    '   /silencio 00:00-08:00 · /silencio off',
    `⏱ Intervalo: ${intervalSeconds} s${settings.poll_interval_seconds ? '' : ' (valor del .env)'}`,
    `   /intervalo 60 · /intervalo auto (= ${defaultInterval} s)`,
    `🕰 Ignorar artículos publicados hace más de: ${settings.max_item_age_hours ? `${settings.max_item_age_hours} h` : 'sin límite'}`,
    '   /antiguedad 24 · /antiguedad 0',
    `🌍 Zona horaria: ${esc(timezone)}`,
  ].join('\n');
}

function logText(rows, clock) {
  if (!rows.length) return '📋 El registro está vacío.';
  const icon = { info: 'ℹ️', warn: '⚠️', error: '❌' };
  return [
    '📋 <b>Registro</b> (más recientes primero)',
    '',
    ...rows.map((r) => `${icon[r.level] || '•'} ${clock(r.ts)} ${esc(r.message.slice(0, 300))}`),
  ].join('\n');
}

module.exports = {
  COMMANDS, helpText, statusText, monitorsList, monitorCard, editMenu, foundText, settingsText, logText,
  filterLines, priceRange, makeClock, eur,
};
