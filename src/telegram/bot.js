'use strict';

const { escapeHtml, formatPrice } = require('./notifier');
const { isQuietTime } = require('./quiet-hours');

const POLL_TIMEOUT_S = 30;
const MAX_COMMAND_AGE_S = 10 * 60; // commands queued while the bot was down are ignored after this
const OFFSET_KEY = 'telegram_offset';

const COMMANDS = [
  { command: 'estado', description: 'Estado de cada monitor y última comprobación' },
  { command: 'monitores', description: 'Lista de monitores con su precio máximo' },
  { command: 'pausar', description: 'Pausar un monitor: /pausar <nombre>' },
  { command: 'reanudar', description: 'Reanudar un monitor: /reanudar <nombre>' },
  { command: 'pausartodo', description: 'Pausar todos los monitores' },
  { command: 'reanudartodo', description: 'Reanudar todos los monitores' },
  { command: 'test', description: 'Enviar un aviso de prueba' },
  { command: 'ayuda', description: 'Lista de comandos' },
];

const STATUS_ICON = { ok: '🟢', limited: '🟠', error: '🔴', pending: '🔵', paused: '⏸' };
const STATUS_TEXT = { ok: 'OK', limited: 'limitado', error: 'error', pending: 'pendiente', paused: 'pausado' };

/**
 * Telegram command handler using long polling (getUpdates), so the server does
 * not need a public URL. Only messages from the configured chat are answered.
 */
class TelegramBot {
  constructor({ api, chatId, store, client, notifier, actions, logger, timezone, now = Date.now, sleep }) {
    this.api = api;
    this.chatId = String(chatId);
    this.store = store;
    this.client = client;
    this.notifier = notifier;
    this.actions = actions;
    this.logger = logger;
    this.timezone = timezone;
    this.now = now;
    this.sleep = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.running = false;
    this.abort = null;
    this.username = null;
    this.initialized = false;
    this.state = { polling: false, lastPollOkAt: null, lastError: null };
    this.ignoredChats = new Set();
  }

  // ------------------------------------------------------------ lifecycle

  async start() {
    if (this.running) return;
    this.running = true;
    this.loop();
  }

  /** One-time setup, retried by the loop until it succeeds. */
  async init() {
    // getUpdates does not work while a webhook is set.
    await this.api.call('deleteWebhook', { drop_pending_updates: false });
    const me = await this.api.call('getMe', {});
    this.username = me.username;
    await this.api.call('setMyCommands', { commands: COMMANDS });
    this.initialized = true;
    this.logger.info('telegram', `Bot @${this.username} conectado`);
  }

  stop() {
    this.running = false;
    this.abort?.abort();
  }

  async loop() {
    let delay = 5000;
    while (this.running) {
      this.abort = new AbortController();
      try {
        if (!this.initialized) await this.init();
        const offset = this.store.getValue(OFFSET_KEY, 0);
        const updates = await this.api.call(
          'getUpdates',
          { offset, timeout: POLL_TIMEOUT_S, allowed_updates: ['message'] },
          { timeoutMs: (POLL_TIMEOUT_S + 15) * 1000, signal: this.abort.signal },
        );
        if (!this.state.polling) this.logger.info('telegram', 'Recibiendo comandos del bot');
        this.state.polling = true;
        this.state.lastPollOkAt = this.now();
        this.state.lastError = null;
        delay = 5000;
        for (const update of updates) {
          // Save the offset first: a command that crashes is never re-run in a loop.
          this.store.setValue(OFFSET_KEY, update.update_id + 1);
          await this.handleUpdate(update).catch((err) =>
            this.logger.error('telegram', `Error procesando un comando: ${err.message}`),
          );
        }
      } catch (err) {
        if (!this.running) break;
        if (this.state.polling || this.state.lastError !== err.message) {
          this.logger.error('telegram', `Fallo al leer comandos: ${err.message}`);
        }
        this.state.polling = false;
        this.state.lastError = err.message;
        // 409 = another instance (or a webhook) is consuming the updates.
        await this.sleep(err.code === 409 ? 30_000 : delay);
        delay = Math.min(delay * 2, 60_000);
      }
    }
  }

  // ------------------------------------------------------------ commands

  async handleUpdate(update) {
    const msg = update.message;
    if (!msg || typeof msg.text !== 'string') return;
    if (String(msg.chat?.id) !== this.chatId) {
      if (!this.ignoredChats.has(msg.chat?.id)) {
        this.ignoredChats.add(msg.chat?.id);
        this.logger.warn('telegram', `Ignorado mensaje de otro chat (${msg.chat?.id})`);
      }
      return;
    }
    if (msg.date && this.now() / 1000 - msg.date > MAX_COMMAND_AGE_S) return;

    const m = /^\/([a-z_]+)(?:@(\S+))?\s*([\s\S]*)$/i.exec(msg.text.trim());
    if (!m) return this.reply('Escribe /ayuda para ver los comandos.');
    const [, rawCmd, target, args] = m;
    if (target && this.username && target.toLowerCase() !== this.username.toLowerCase()) return;
    const reply = await this.run(rawCmd.toLowerCase(), args.trim());
    if (reply) await this.reply(reply);
  }

  async run(cmd, args) {
    switch (cmd) {
      case 'start':
      case 'ayuda':
      case 'help':
        return this.helpText();
      case 'estado':
        return this.statusText();
      case 'monitores':
        return this.monitorsText();
      case 'pausar':
        return this.toggleOne(args, false);
      case 'reanudar':
        return this.toggleOne(args, true);
      case 'pausartodo':
        return this.toggleAll(false);
      case 'reanudartodo':
        return this.toggleAll(true);
      case 'test': {
        const res = await this.notifier.sendTest();
        return res.usedRealItem ? null : 'Aún no hay artículos encontrados: he enviado un ejemplo solo con texto.';
      }
      default:
        return `Comando no reconocido: /${escapeHtml(cmd)}\n\n${this.helpText()}`;
    }
  }

  reply(text) {
    return this.notifier.sendText(text);
  }

  helpText() {
    return [
      '🎯 <b>Vinted Sniper</b>',
      '',
      ...COMMANDS.map((c) => `/${c.command} — ${escapeHtml(c.description)}`),
    ].join('\n');
  }

  time(ts) {
    if (!ts) return '—';
    const fmt = new Intl.DateTimeFormat('es-ES', { timeZone: this.timezone, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const day = new Intl.DateTimeFormat('es-ES', { timeZone: this.timezone, day: '2-digit', month: '2-digit' });
    const sameDay = day.format(ts) === day.format(this.now());
    return sameDay ? fmt.format(ts) : `${day.format(ts)} ${fmt.format(ts)}`;
  }

  statusText() {
    const v = this.client.status();
    const counts = this.store.counts();
    const settings = this.store.getSettings();
    const quietNow = isQuietTime(settings, this.timezone, new Date(this.now()));
    const lines = [
      '📊 <b>Estado</b>',
      v.blocked
        ? `Vinted: ⚠️ limitado (HTTP ${v.lastBlockStatus}) hasta ${this.time(v.blockedUntil)}`
        : 'Vinted: ✅ normal',
      `Encontrados 24 h: ${counts.found24h}`,
      `Avisos: ${settings.notifications_enabled ? 'activados' : '⛔ desactivados'}` +
        (settings.quiet_enabled ? ` · silencio ${settings.quiet_start}–${settings.quiet_end}${quietNow ? ' (ahora)' : ''}` : ''),
      '',
    ];
    const monitors = this.store.listMonitors();
    if (!monitors.length) lines.push('No hay monitores.');
    for (const m of monitors) {
      const st = m.enabled ? m.status : 'paused';
      lines.push(
        `${STATUS_ICON[st] || '•'} <b>${escapeHtml(m.name)}</b> — ${STATUS_TEXT[st] || st} · ${this.time(m.last_check_at)}`,
      );
      if (m.enabled && (st === 'error' || st === 'limited') && m.status_message) {
        lines.push(`   <i>${escapeHtml(m.status_message)}</i>`);
      }
    }
    return lines.join('\n');
  }

  monitorsText() {
    const monitors = this.store.listMonitors();
    if (!monitors.length) return 'No hay monitores. Créalos desde la web.';
    return [
      `🎯 <b>Monitores (${monitors.length})</b>`,
      ...monitors.map((m) => {
        const range = m.price_from != null
          ? `${formatPrice(m.price_from)} – ${formatPrice(m.price_to)}`
          : `máx. ${formatPrice(m.price_to)}`;
        return `#${m.id} <b>${escapeHtml(m.name)}</b> — ${escapeHtml(range)}${m.enabled ? '' : ' · ⏸ pausado'}`;
      }),
    ].join('\n');
  }

  toggleOne(query, enabled) {
    const verb = enabled ? 'reanudar' : 'pausar';
    if (!query) return `Indica el monitor: /${verb} &lt;nombre&gt;\n\n${this.monitorsText()}`;
    const { match, candidates } = this.actions.findByName(query);
    if (!match) {
      if (!candidates.length) return `No hay ningún monitor que se llame «${escapeHtml(query)}».\n\n${this.monitorsText()}`;
      return [
        `«${escapeHtml(query)}» coincide con varios monitores, no he cambiado ninguno:`,
        ...candidates.map((m) => `#${m.id} ${escapeHtml(m.name)}`),
        '',
        `Usa el nombre completo o el número, por ejemplo /${verb} ${candidates[0].id}`,
      ].join('\n');
    }
    if (match.enabled === enabled) {
      return `«${escapeHtml(match.name)}» ya estaba ${enabled ? 'activo' : 'pausado'}.`;
    }
    this.actions.setEnabled(match.id, enabled);
    return enabled
      ? `▶️ «${escapeHtml(match.name)}» reanudado. La primera pasada marcará lo existente como visto.`
      : `⏸ «${escapeHtml(match.name)}» pausado.`;
  }

  toggleAll(enabled) {
    const changed = this.actions.setAllEnabled(enabled);
    if (!changed.length) return enabled ? 'Todos los monitores ya estaban activos.' : 'Todos los monitores ya estaban pausados.';
    const names = changed.map((m) => escapeHtml(m.name)).join(', ');
    return enabled ? `▶️ Reanudados ${changed.length}: ${names}` : `⏸ Pausados ${changed.length}: ${names}`;
  }

  status() {
    return { username: this.username, ...this.state };
  }
}

module.exports = { TelegramBot, COMMANDS };
