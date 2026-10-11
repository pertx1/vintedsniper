/* Vinted Sniper — front end (vanilla JS). */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  catalogs: null,
  conditions: [],
  domain: 'www.vinted.es',
  monitors: [],
  found: [],
  foundFilter: '',
  foundDone: false,
  editingId: null,
  extraParams: {},
  refreshTimer: null,
};

const STATUS_LABEL = { ok: 'OK', limited: 'Limitado', error: 'Error', pending: 'Pendiente', paused: 'Pausado' };
const TITLES = { monitors: 'Monitores', found: 'Encontrados', settings: 'Ajustes', help: 'Ayuda' };

// ------------------------------------------------------------------ helpers

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (res.status === 401 && path !== '/login') {
    showLogin();
    throw new Error('Sesión caducada');
  }
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.toggle('err', isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), isError ? 5000 : 2500);
}

function ago(ts) {
  if (!ts) return '—';
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 0) return 'ahora';
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function inTime(ts) {
  if (!ts) return '';
  const s = Math.round((ts - Date.now()) / 1000);
  return s <= 0 ? 'ya' : s < 60 ? `en ${s} s` : `en ${Math.round(s / 60)} min`;
}

function clock(ts) {
  return ts ? new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
}

function money(n, cur = 'EUR') {
  if (n == null) return '';
  try {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: cur }).format(n);
  } catch {
    return `${n} ${cur}`;
  }
}

// ------------------------------------------------------------------ auth

function showLogin() {
  $('#app').hidden = true;
  $('#view-login').hidden = false;
  clearInterval(state.refreshTimer);
}

async function showApp() {
  $('#view-login').hidden = true;
  $('#app').hidden = false;
  if (!state.catalogs) {
    const ref = await api('/catalogs');
    state.catalogs = ref.catalogs;
    state.conditions = ref.conditions;
    state.domain = ref.domain;
  }
  route();
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const err = $('#login-error');
  err.hidden = true;
  try {
    await api('/login', { method: 'POST', body: { password: e.target.password.value } });
    e.target.reset();
    await showApp();
  } catch (ex) {
    err.textContent = ex.message;
    err.hidden = false;
  }
});

$('#logout').addEventListener('click', async () => {
  await api('/logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

// ------------------------------------------------------------------ routing

function currentView() {
  const v = location.hash.replace('#', '');
  return TITLES[v] ? v : 'monitors';
}

function route() {
  if ($('#app').hidden) return;
  const view = currentView();
  for (const id of Object.keys(TITLES)) $(`#view-${id}`).hidden = id !== view;
  for (const a of $$('.tabbar a')) a.classList.toggle('active', a.dataset.tab === view);
  $('#page-title').textContent = TITLES[view];

  const actions = $('#topbar-actions');
  actions.innerHTML = '';
  if (view === 'monitors') {
    actions.innerHTML = '<button class="btn primary small" id="new-monitor">+ Nuevo</button>';
    $('#new-monitor').addEventListener('click', () => openEditor(null));
  } else if (view === 'help') {
    actions.innerHTML = '<a class="btn ghost small" href="#settings">Volver</a>';
  }

  clearInterval(state.refreshTimer);
  const load = { monitors: loadMonitors, found: () => loadFound(true), settings: loadSettings, help: async () => {} }[view];
  load().catch((e) => toast(e.message, true));
  // Light auto-refresh while the screen is open.
  if (view === 'monitors' || view === 'found' || view === 'settings') {
    state.refreshTimer = setInterval(() => {
      if (document.hidden || $('#monitor-dialog').open) return;
      (view === 'monitors' ? loadMonitors() : view === 'found' ? refreshFound() : loadStatus()).catch(() => {});
    }, 15000);
  }
}
window.addEventListener('hashchange', route);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !$('#app').hidden) route();
});

// ------------------------------------------------------------------ monitors

function conditionLabel(id) {
  return state.conditions.find((c) => c.id === id)?.label || `#${id}`;
}

function kindLabel(m) {
  if (m.kind === 'custom') return m.catalog_ids.length ? `Categoría ${m.catalog_ids.join(', ')}` : 'Todas las categorías';
  const entry = state.catalogs?.[m.kind];
  if (!entry) return m.kind;
  const g = entry.genders[m.gender];
  const sub = g?.subcategories?.[m.subcategory];
  return [entry.label, g?.label, sub?.label].filter(Boolean).join(' · ');
}

function monitorCard(m) {
  const tags = [];
  if (m.search_text) tags.push(`“${esc(m.search_text)}”`);
  tags.push(esc(kindLabel(m)));
  tags.push(`${m.price_from != null ? esc(money(m.price_from)) + ' – ' : 'hasta '}${esc(money(m.price_to))}`);
  if (m.brand_ids.length) tags.push(`${m.brand_ids.length} marca${m.brand_ids.length > 1 ? 's' : ''}`);
  if (m.size_ids.length) tags.push(`${m.size_ids.length} talla${m.size_ids.length > 1 ? 's' : ''}`);
  if (m.status_ids.length) tags.push(esc(m.status_ids.map(conditionLabel).join(', ')));
  if (m.exclude_words.length) tags.push(`sin: ${esc(m.exclude_words.join(', '))}`);
  if (Object.keys(m.extra_params || {}).length) tags.push('+ filtros URL');

  const status = m.enabled ? m.status : 'paused';
  return `
    <article class="card monitor ${m.enabled ? '' : 'paused'}" data-id="${m.id}">
      <div class="title">
        <h3>${esc(m.name)}</h3>
        <span class="status ${esc(status)}">${STATUS_LABEL[status] || esc(status)}</span>
      </div>
      <div class="tags">${tags.map((t) => `<span class="chip">${t}</span>`).join('')}</div>
      <div class="meta">
        Última comprobación: ${m.last_check_at ? `${clock(m.last_check_at)} (${ago(m.last_check_at)})` : '—'}
        ${m.enabled && m.next_run_at ? ` · próxima ${inTime(m.next_run_at)}` : ''}
        ${m.status_message ? `<br>${esc(m.status_message)}` : ''}
      </div>
      <div class="actions">
        <button class="btn small" data-act="edit">Editar</button>
        <button class="btn small" data-act="toggle">${m.enabled ? 'Pausar' : 'Reanudar'}</button>
        ${m.enabled ? '<button class="btn small" data-act="run">Comprobar ahora</button>' : ''}
        <a class="btn small ghost" href="#found" data-act="found">Encontrados</a>
        <button class="btn small ghost danger" data-act="delete">Borrar</button>
      </div>
    </article>`;
}

async function loadMonitors() {
  state.monitors = await api('/monitors');
  $('#monitor-list').innerHTML = state.monitors.map(monitorCard).join('');
  $('#monitors-empty').hidden = state.monitors.length > 0;
}

$('#monitor-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = Number(btn.closest('[data-id]').dataset.id);
  const m = state.monitors.find((x) => x.id === id);
  try {
    switch (btn.dataset.act) {
      case 'edit':
        openEditor(m);
        break;
      case 'toggle':
        await api(`/monitors/${id}/toggle`, { method: 'POST', body: { enabled: !m.enabled } });
        toast(m.enabled ? 'Monitor pausado' : 'Monitor reanudado');
        await loadMonitors();
        break;
      case 'run':
        btn.disabled = true;
        btn.textContent = 'Comprobando…';
        await api(`/monitors/${id}/run`, { method: 'POST' });
        await loadMonitors();
        break;
      case 'found':
        state.foundFilter = String(id);
        break;
      case 'delete':
        if (!confirm(`¿Borrar el monitor «${m.name}»?`)) return;
        await api(`/monitors/${id}`, { method: 'DELETE' });
        toast('Monitor borrado');
        await loadMonitors();
        break;
    }
  } catch (ex) {
    toast(ex.message, true);
    loadMonitors().catch(() => {});
  }
});

// ------------------------------------------------------------------ editor

const form = $('#monitor-form');
const dialog = $('#monitor-dialog');

function fillSubcategories() {
  const kind = form.kind.value;
  const gender = form.gender.value;
  const entry = state.catalogs?.[kind];
  const sel = form.subcategory;
  const prev = sel.value;
  const subs = new Map();
  if (entry) {
    for (const [g, def] of Object.entries(entry.genders)) {
      if (gender && g !== gender) continue;
      for (const [key, sub] of Object.entries(def.subcategories)) subs.set(key, sub.label);
    }
  }
  sel.innerHTML = '<option value="">Todas</option>' + [...subs].map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('');
  sel.value = subs.has(prev) ? prev : '';
  $('#subcategory-field').hidden = subs.size === 0;
  $('#catalog-field').hidden = kind !== 'custom';
  form.gender.disabled = kind === 'custom';
}
form.kind.addEventListener('change', fillSubcategories);
form.gender.addEventListener('change', fillSubcategories);

function renderStatusOptions(selected = []) {
  $('#status-options').innerHTML = state.conditions
    .map(
      (c) => `<label class="chip"><input type="checkbox" name="status_ids" value="${c.id}" ${selected.includes(c.id) ? 'checked' : ''}>${esc(c.label)}</label>`,
    )
    .join('');
}

function renderExtra() {
  const entries = Object.entries(state.extraParams || {});
  $('#extra-params').hidden = entries.length === 0;
  $('#extra-list').innerHTML = entries
    .map(([k, v]) => `<span class="chip">${esc(k)}: ${esc(Array.isArray(v) ? v.join(', ') : v)}</span>`)
    .join('');
}
$('#extra-clear').addEventListener('click', () => {
  state.extraParams = {};
  renderExtra();
});

function setForm(m) {
  form.reset();
  form.name.value = m?.name || '';
  form.search_text.value = m?.search_text || '';
  form.kind.value = m?.kind || 'sneakers';
  form.gender.value = m?.gender || '';
  fillSubcategories();
  form.subcategory.value = m?.subcategory || '';
  form.catalog_ids.value = (m?.catalog_ids || []).join(', ');
  form.price_from.value = m?.price_from ?? '';
  form.price_to.value = m?.price_to ?? '';
  form.brand_ids.value = (m?.brand_ids || []).join(', ');
  form.size_ids.value = (m?.size_ids || []).join(', ');
  form.exclude_words.value = (m?.exclude_words || []).join(', ');
  form.check_description.checked = !!m?.check_description;
  form.enabled.checked = m ? m.enabled : true;
  renderStatusOptions(m?.status_ids || []);
  state.extraParams = { ...(m?.extra_params || {}) };
  state.sourceUrl = m?.source_url || '';
  renderExtra();
}

function openEditor(m) {
  state.editingId = m?.id ?? null;
  $('#monitor-dialog-title').textContent = m ? 'Editar monitor' : 'Nuevo monitor';
  $('#monitor-error').hidden = true;
  $('#parse-warnings').innerHTML = '';
  $('#paste-url').value = m?.source_url || '';
  setForm(m);
  dialog.showModal();
  dialog.scrollTop = 0;
}

dialog.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) dialog.close();
});

$('#parse-url').addEventListener('click', async () => {
  const url = $('#paste-url').value.trim();
  if (!url) return toast('Pega primero una URL de Vinted', true);
  try {
    const p = await api('/parse-url', { method: 'POST', body: { url } });
    form.kind.value = 'custom';
    fillSubcategories();
    if (p.search_text) form.search_text.value = p.search_text;
    form.catalog_ids.value = p.catalog_ids.join(', ');
    form.brand_ids.value = p.brand_ids.join(', ');
    form.size_ids.value = p.size_ids.join(', ');
    if (p.price_from != null) form.price_from.value = p.price_from;
    if (p.price_to != null) form.price_to.value = p.price_to;
    renderStatusOptions(p.status_ids);
    state.extraParams = p.extra_params;
    state.sourceUrl = p.source_url;
    renderExtra();
    if (!form.name.value) form.name.value = p.search_text || 'Búsqueda de Vinted';
    $('#parse-warnings').innerHTML = (p.warnings || []).map((w) => `<li>${esc(w)}</li>`).join('');
    toast('Filtros extraídos');
  } catch (ex) {
    toast(ex.message, true);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    name: form.name.value,
    search_text: form.search_text.value,
    kind: form.kind.value,
    gender: form.gender.value,
    subcategory: form.subcategory.value,
    catalog_ids: form.catalog_ids.value,
    price_from: form.price_from.value,
    price_to: form.price_to.value,
    brand_ids: form.brand_ids.value,
    size_ids: form.size_ids.value,
    status_ids: $$('input[name="status_ids"]:checked', form).map((i) => Number(i.value)),
    exclude_words: form.exclude_words.value,
    check_description: form.check_description.checked,
    extra_params: state.extraParams,
    source_url: state.sourceUrl || '',
    enabled: form.enabled.checked,
  };
  try {
    if (state.editingId) await api(`/monitors/${state.editingId}`, { method: 'PUT', body });
    else await api('/monitors', { method: 'POST', body });
    dialog.close();
    toast(state.editingId ? 'Monitor actualizado' : 'Monitor creado. La primera pasada marcará lo existente como visto.');
    await loadMonitors();
  } catch (ex) {
    const err = $('#monitor-error');
    err.textContent = ex.message;
    err.hidden = false;
    dialog.querySelector('.sheet-body').scrollTop = 0;
    dialog.scrollTop = 0;
  }
});

// ------------------------------------------------------------------ found

function itemCard(it) {
  const showTotal = it.total_price != null && it.total_price !== it.price;
  return `
    <article class="item">
      <a class="photo" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
        ${it.photo_url ? `<img src="${esc(it.photo_url)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
        <span class="age" title="Publicado">${esc(ago(it.published_at || it.found_at))}</span>
      </a>
      <div class="body">
        <div class="price">${esc(money(it.price, it.currency))}${showTotal ? ` <small>${esc(money(it.total_price, it.currency))} total</small>` : ''}</div>
        ${it.brand ? `<div class="brand">${esc(it.brand)}</div>` : ''}
        <div class="ttl">${esc(it.title)}</div>
        <div class="det">${esc([it.size && `Talla ${it.size}`, it.condition].filter(Boolean).join(' · '))}</div>
        <div class="mon">${esc(it.monitors.map((m) => m.name).join(', '))}${it.notified ? '' : ' · sin aviso'}</div>
      </div>
      <a class="btn primary small" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">Abrir en Vinted</a>
    </article>`;
}

async function fillFoundFilter() {
  if (!state.monitors.length) state.monitors = await api('/monitors');
  const sel = $('#found-filter');
  sel.innerHTML =
    '<option value="">Todos los monitores</option>' +
    state.monitors.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
  sel.value = state.monitors.some((m) => String(m.id) === state.foundFilter) ? state.foundFilter : '';
}

function foundQuery(before) {
  const q = new URLSearchParams({ limit: '40' });
  if (state.foundFilter) q.set('monitor_id', state.foundFilter);
  if (before) q.set('before', before);
  return '/found?' + q;
}

async function loadFound(reset) {
  if (reset) {
    await fillFoundFilter();
    state.found = [];
    state.foundDone = false;
  }
  const before = state.found.length ? state.found[state.found.length - 1].found_at : null;
  const page = await api(foundQuery(before));
  state.found.push(...page);
  state.foundDone = page.length < 40;
  renderFound();
}

async function refreshFound() {
  const page = await api(foundQuery(null));
  const known = new Set(state.found.map((f) => f.item_id));
  const fresh = page.filter((f) => !known.has(f.item_id));
  if (fresh.length) {
    state.found.unshift(...fresh);
    renderFound();
  } else {
    // Update relative times.
    renderFound();
  }
}

function renderFound() {
  $('#found-list').innerHTML = state.found.map(itemCard).join('');
  $('#found-empty').hidden = state.found.length > 0;
  $('#found-more').hidden = state.foundDone || !state.found.length;
}

$('#found-filter').addEventListener('change', (e) => {
  state.foundFilter = e.target.value;
  loadFound(true).catch((ex) => toast(ex.message, true));
});
$('#found-more').addEventListener('click', () => loadFound(false).catch((ex) => toast(ex.message, true)));

// ------------------------------------------------------------------ telegram

function renderTelegramState(tg) {
  const el = $('#tg-state');
  const bot = tg.bot;
  let text;
  if (!tg.tokenSet || !tg.chatIdSet) {
    text = `⚠️ Falta ${[!tg.tokenSet && 'TELEGRAM_BOT_TOKEN', !tg.chatIdSet && 'TELEGRAM_CHAT_ID'].filter(Boolean).join(' y ')} en el .env del servidor.`;
  } else {
    text = bot?.username ? `Bot @${bot.username}` : 'Bot configurado';
    text += bot?.polling ? ' · ✅ escuchando comandos' : bot?.lastError ? ` · ⚠️ ${bot.lastError}` : '';
    if (tg.lastErrorAt && (!tg.lastOkAt || tg.lastErrorAt > tg.lastOkAt)) {
      text += `\n⚠️ Último envío fallido ${ago(tg.lastErrorAt)}: ${tg.lastError}`;
    } else if (tg.lastOkAt) {
      text += `\nÚltimo aviso enviado ${ago(tg.lastOkAt)}.`;
    }
  }
  el.textContent = text;
  el.style.whiteSpace = 'pre-line';
  $('#tg-test').disabled = !tg.configured;
}

$('#tg-test').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const r = await api('/telegram/test', { method: 'POST' });
    toast(r.usedRealItem ? 'Aviso de prueba enviado a Telegram' : 'Aviso de ejemplo (solo texto) enviado a Telegram');
  } catch (ex) {
    toast(ex.message, true);
  }
  btn.disabled = false;
  loadStatus().catch(() => {});
});

// Earlier versions installed a service worker for Web Push: remove it.
async function removeOldServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  try {
    for (const reg of await navigator.serviceWorker.getRegistrations()) await reg.unregister();
  } catch {
    /* ignore */
  }
}

// ------------------------------------------------------------------ settings

async function loadSettings() {
  const settings = await api('/settings');
  $('#set-notifications').checked = settings.notifications_enabled;
  $('#set-quiet').checked = settings.quiet_enabled;
  $('#set-quiet-start').value = settings.quiet_start;
  $('#set-quiet-end').value = settings.quiet_end;
  $('#set-interval').value = settings.poll_interval_seconds ?? '';
  $('#set-interval').placeholder = `${settings.default_poll_interval_seconds} (valor del .env)`;
  $('#set-max-age').value = settings.max_item_age_hours;
  $('#set-tz').textContent = settings.timezone;
  await Promise.all([loadStatus(), loadLogs()]);
}

async function saveSettings(partial) {
  try {
    await api('/settings', { method: 'PUT', body: partial });
    toast('Ajustes guardados');
  } catch (ex) {
    toast(ex.message, true);
  }
}

$('#set-notifications').addEventListener('change', (e) => saveSettings({ notifications_enabled: e.target.checked }));
$('#settings-save').addEventListener('click', () =>
  saveSettings({
    quiet_enabled: $('#set-quiet').checked,
    quiet_start: $('#set-quiet-start').value,
    quiet_end: $('#set-quiet-end').value,
    poll_interval_seconds: $('#set-interval').value || null,
    max_item_age_hours: $('#set-max-age').value || 0,
  }),
);
for (const id of ['#set-quiet']) {
  $(id).addEventListener('change', () =>
    saveSettings({
      quiet_enabled: $('#set-quiet').checked,
      quiet_start: $('#set-quiet-start').value,
      quiet_end: $('#set-quiet-end').value,
      }),
  );
}

function duration(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return [d && `${d} d`, h && `${h} h`, `${m} min`].filter(Boolean).join(' ');
}

async function loadStatus() {
  const s = await api('/status');
  const v = s.vinted;
  const rows = [
    ['En marcha', duration(s.now - s.startedAt)],
    ['Vinted', v.domain],
    ['Sesión Vinted', v.hasAccessToken ? `OK (${ago(v.sessionAt)})` : v.hasSession ? 'Cookies sin token' : 'Sin sesión'],
    ['Estado Vinted', v.blocked ? `⚠️ Limitado (HTTP ${v.lastBlockStatus}) hasta ${clock(v.blockedUntil)}` : 'Normal'],
    ['Peticiones', `${v.requests} (${v.ok} OK, ${v.limited} limitadas, ${v.errors} errores)`],
    ['Última respuesta OK', v.lastOkAt ? `${clock(v.lastOkAt)} (${ago(v.lastOkAt)})` : '—'],
    ['Intervalo', `${s.intervalSeconds} s`],
    ['Monitores activos', `${s.counts.activeMonitors} / ${s.counts.monitors}`],
    ['Encontrados (24 h / total)', `${s.counts.found24h} / ${s.counts.found}`],
    ['Telegram', s.telegram.configured ? (s.telegram.bot?.polling ? 'Conectado' : '⚠️ Sin conexión con el bot') : '⚠️ Sin configurar'],
    ['Versión', s.version],
  ];
  $('#system-status').innerHTML = rows.map(([k, val]) => `<dt>${esc(k)}</dt><dd>${esc(val)}</dd>`).join('');
  renderTelegramState(s.telegram);
}

async function loadLogs() {
  const level = $('#log-level').value;
  const rows = await api('/logs?limit=200' + (level ? `&level=${level}` : ''));
  $('#log-list').innerHTML = rows.length
    ? rows
        .map(
          (r) => `<li><time>${esc(new Date(r.ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }))}</time><span class="lv ${esc(r.level)}">${esc(r.level.toUpperCase())}</span>${r.monitor_name && !r.message.startsWith(r.monitor_name) ? `<strong>${esc(r.monitor_name)}:</strong> ` : ''}${esc(r.message)}</li>`,
        )
        .join('')
    : '<li class="muted">Sin entradas</li>';
}
$('#log-level').addEventListener('change', () => loadLogs().catch((e) => toast(e.message, true)));
$('#log-clear').addEventListener('click', async () => {
  if (!confirm('¿Vaciar el registro?')) return;
  await api('/logs', { method: 'DELETE' });
  loadLogs();
});

// ------------------------------------------------------------------ boot

(async function boot() {
  removeOldServiceWorkers();
  try {
    const me = await api('/me');
    if (me.authenticated) await showApp();
    else showLogin();
  } catch {
    showLogin();
  }
})();
