'use strict';

const { escapeHtml: esc } = require('./notifier');
const { isQuietTime, toMinutes } = require('./quiet-hours');
const { validateSettings } = require('../monitor/validation');
const { createWizard, findVintedUrl } = require('./wizard');
const views = require('./views');

const POLL_TIMEOUT_S = 30;
const MAX_COMMAND_AGE_S = 10 * 60; // commands queued while the bot was down are ignored after this
const OFFSET_KEY = 'telegram_offset';
const MAX_TEXT = 4000; // Telegram limit is 4096

/** Cuts long messages at a line boundary so HTML tags stay balanced. */
function fit(text) {
  if (text.length <= MAX_TEXT) return text;
  const cut = text.lastIndexOf('\n', MAX_TEXT - 2);
  return text.slice(0, cut > 0 ? cut : MAX_TEXT - 2) + '\n…';
}

/**
 * The whole user interface: commands, inline buttons and the create/edit
 * conversations. Uses long polling (getUpdates), so the server needs no public
 * URL. Only the configured chat is answered; everything else is ignored.
 */
class TelegramBot {
  constructor({
    api, chatId, store, client, notifier, actions, scheduler, logger, timezone,
    domain = 'www.vinted.es', defaultIntervalSeconds = 45, now = Date.now, sleep,
  }) {
    this.api = api;
    this.chatId = String(chatId);
    this.store = store;
    this.client = client;
    this.notifier = notifier;
    this.actions = actions;
    this.scheduler = scheduler;
    this.logger = logger;
    this.timezone = timezone;
    this.domain = domain;
    this.defaultIntervalSeconds = defaultIntervalSeconds;
    this.now = now;
    this.sleep = sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.clock = views.makeClock(timezone, now);
    this.wizard = createWizard({ store, actions, domain, now, clock: this.clock });
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
    await this.api.call('setMyCommands', { commands: views.COMMANDS });
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
          { offset, timeout: POLL_TIMEOUT_S, allowed_updates: ['message', 'callback_query'] },
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
            this.logger.error('telegram', `Error procesando un mensaje: ${err.message}`),
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

  // ------------------------------------------------------------ transport

  isAuthorized(chatId) {
    if (String(chatId) === this.chatId) return true;
    if (!this.ignoredChats.has(chatId)) {
      this.ignoredChats.add(chatId);
      this.logger.warn('telegram', `Ignorado mensaje de otro chat (${chatId})`);
    }
    return false;
  }

  reply(res) {
    if (!res || !res.text) return null;
    return this.api.send('sendMessage', {
      chat_id: this.chatId,
      text: fit(res.text),
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
      ...(res.markup ? { reply_markup: res.markup } : {}),
    });
  }

  /** Replaces the text of a message (e.g. a monitor card after pressing a button). */
  async edit(messageId, res) {
    try {
      await this.api.send('editMessageText', {
        chat_id: this.chatId,
        message_id: messageId,
        text: fit(res.text),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...(res.markup ? { reply_markup: res.markup } : {}),
      });
    } catch (err) {
      if (/message is not modified/i.test(err.message)) return;
      // Message too old or deleted: send it as a new one.
      await this.reply(res);
    }
  }

  async handleUpdate(update) {
    if (update.callback_query) return this.handleCallback(update.callback_query);
    const msg = update.message;
    if (!msg || typeof msg.text !== 'string') return;
    if (!this.isAuthorized(msg.chat?.id)) return;
    if (msg.date && this.now() / 1000 - msg.date > MAX_COMMAND_AGE_S) return;

    const text = msg.text.trim();
    const m = /^\/([a-z_]+)(?:@(\S+))?\s*([\s\S]*)$/i.exec(text);
    if (m) {
      const [, cmd, target, args] = m;
      if (target && this.username && target.toLowerCase() !== this.username.toLowerCase()) return;
      return this.reply(await this.command(cmd.toLowerCase(), args.trim()));
    }
    // Free text: answer to an open conversation, or a pasted Vinted URL.
    const answer = this.wizard.handleText(text);
    if (answer) return this.reply(answer);
    const url = findVintedUrl(text);
    if (url) return this.reply(this.wizard.start(url));
    return this.reply({ text: 'Pega aquí una URL de búsqueda de Vinted para crear un monitor, o escribe /ayuda.' });
  }

  async handleCallback(cq) {
    const chatId = cq.message?.chat?.id;
    if (!this.isAuthorized(chatId)) {
      await this.api.call('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => {});
      return;
    }
    let toast = '';
    try {
      const res = await this.button(String(cq.data || ''), cq.message.message_id);
      toast = res?.toast || '';
    } finally {
      await this.api.call('answerCallbackQuery', { callback_query_id: cq.id, text: toast }).catch(() => {});
    }
  }

  // ------------------------------------------------------------ commands

  resolve(query, verb) {
    const withList = (intro) => {
      const list = this.listView();
      return { text: `${intro}\n\n${list.text}`, markup: list.markup };
    };
    if (!query) return { error: withList(`Indica el monitor: /${verb} &lt;nombre&gt;`) };
    const { match, candidates } = this.actions.findByName(query);
    if (match) return { monitor: match };
    if (!candidates.length) return { error: withList(`No hay ningún monitor que se llame «${esc(query)}».`) };
    return {
      error: {
        text: [
          `«${esc(query)}» coincide con varios monitores, no he cambiado ninguno:`,
          ...candidates.map((c) => `#${c.id} ${esc(c.name)}`),
          '',
          `Usa el nombre completo o el número, por ejemplo /${verb} ${candidates[0].id}`,
        ].join('\n'),
      },
    };
  }

  listView() {
    const v = views.monitorsList(this.store.listMonitors());
    return { text: v.text, markup: v.markup };
  }

  async command(cmd, args) {
    switch (cmd) {
      case 'start':
      case 'ayuda':
      case 'help':
        return { text: views.helpText() };
      case 'nuevo':
        if (findVintedUrl(args)) return this.wizard.start(findVintedUrl(args));
        return {
          text: '🆕 Para crear un monitor:\n1. En Vinted (web o app) busca y aplica los filtros que quieras.\n2. Copia el enlace (en la app: Compartir → Copiar enlace).\n3. <b>Pégalo aquí</b> y te iré preguntando lo que falte.',
        };
      case 'cancelar':
        return { text: this.wizard.cancel() ? 'Cancelado.' : 'No había nada en curso.' };
      case 'estado':
        return { text: this.statusText() };
      case 'monitores':
        return this.listView();
      case 'ver': {
        const r = this.resolve(args, 'ver');
        return r.error || views.monitorCard(r.monitor, this.clock);
      }
      case 'editar': {
        const r = this.resolve(args, 'editar');
        return r.error || views.editMenu(r.monitor);
      }
      case 'borrar': {
        const r = this.resolve(args, 'borrar');
        return r.error || this.deleteConfirm(r.monitor);
      }
      case 'pausar':
      case 'reanudar': {
        const enabled = cmd === 'reanudar';
        const r = this.resolve(args, cmd);
        if (r.error) return r.error;
        return { text: this.toggle(r.monitor, enabled) };
      }
      case 'pausartodo':
      case 'reanudartodo':
        return { text: this.toggleAll(cmd === 'reanudartodo') };
      case 'encontrados': {
        let monitor = null;
        if (args) {
          const r = this.resolve(args, 'encontrados');
          if (r.error) return r.error;
          monitor = r.monitor;
        }
        return { text: this.foundText(monitor) };
      }
      case 'ajustes':
        return { text: this.settingsText() };
      case 'avisos':
        return this.setting(args, (a) => {
          const v = a.toLowerCase();
          if (['on', 'si', 'sí', 'activar'].includes(v)) return { notifications_enabled: true };
          if (['off', 'no', 'desactivar'].includes(v)) return { notifications_enabled: false };
          return null;
        }, 'Uso: /avisos on · /avisos off');
      case 'silencio':
        return this.setting(args, (a) => {
          if (['off', 'no', 'desactivar'].includes(a.toLowerCase())) return { quiet_enabled: false };
          const m = /^(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2})$/i.exec(a);
          if (!m || toMinutes(m[1]) == null || toMinutes(m[2]) == null) return null;
          return { quiet_enabled: true, quiet_start: m[1].padStart(5, '0'), quiet_end: m[2].padStart(5, '0') };
        }, 'Uso: /silencio 00:00-08:00 · /silencio off');
      case 'intervalo':
        return this.setting(args, (a) => {
          if (['auto', 'defecto'].includes(a.toLowerCase())) return { poll_interval_seconds: null };
          return /^\d+$/.test(a) ? { poll_interval_seconds: a } : null;
        }, `Uso: /intervalo 60 (entre 15 y 3600 s) · /intervalo auto (= ${this.defaultIntervalSeconds} s)`);
      case 'antiguedad':
      case 'antigüedad':
        return this.setting(args, (a) => (/^\d+$/.test(a) ? { max_item_age_hours: a } : null), 'Uso: /antiguedad 24 (horas, 0 = sin límite)');
      case 'registro':
        return { text: this.logText(args) };
      case 'test': {
        const res = await this.notifier.sendTest();
        return res.usedRealItem ? null : { text: 'Aún no hay artículos encontrados: he enviado un ejemplo solo con texto.' };
      }
      default:
        return { text: `Comando no reconocido: /${esc(cmd)}\n\n${views.helpText()}` };
    }
  }

  // ------------------------------------------------------------ buttons

  async button(data, messageId) {
    const [kind, a, b] = data.split(':');
    if (kind === 'w') {
      await this.reply(this.wizard.handleButton(a, b));
      return null;
    }
    const id = Number(kind === 'ef' ? b : a);
    const m = this.store.getMonitor(id);
    if (!m) {
      await this.edit(messageId, { text: 'Ese monitor ya no existe.' });
      return { toast: 'Ya no existe' };
    }
    switch (kind) {
      case 'mon':
        await this.edit(messageId, views.monitorCard(m, this.clock));
        return null;
      case 'pause':
      case 'resume': {
        const text = this.toggle(m, kind === 'resume');
        await this.edit(messageId, views.monitorCard(this.store.getMonitor(id), this.clock));
        return { toast: text.replace(/<[^>]+>/g, '').slice(0, 190) };
      }
      case 'run': {
        if (!m.enabled) return { toast: 'Está pausado' };
        await this.scheduler.runNow(id);
        await this.edit(messageId, views.monitorCard(this.store.getMonitor(id), this.clock));
        return { toast: 'Comprobado' };
      }
      case 'edit':
        await this.edit(messageId, views.editMenu(m));
        return null;
      case 'ef':
        await this.reply(this.wizard.startEdit(id, a));
        return null;
      case 'found':
        await this.reply({ text: this.foundText(m) });
        return null;
      case 'del':
        await this.edit(messageId, this.deleteConfirm(m));
        return null;
      case 'delok':
        this.actions.remove(id);
        await this.edit(messageId, { text: `🗑 «${esc(m.name)}» borrado.` });
        return { toast: 'Borrado' };
      default:
        return null;
    }
  }

  // ------------------------------------------------------------ helpers

  deleteConfirm(m) {
    return {
      text: `🗑 ¿Borrar el monitor «${esc(m.name)}»? Se pierde también su historial de artículos vistos.`,
      markup: {
        inline_keyboard: [[
          { text: '🗑 Sí, borrar', callback_data: `delok:${m.id}` },
          { text: 'No', callback_data: `mon:${m.id}` },
        ]],
      },
    };
  }

  toggle(monitor, enabled) {
    if (monitor.enabled === enabled) return `«${esc(monitor.name)}» ya estaba ${enabled ? 'activo' : 'pausado'}.`;
    this.actions.setEnabled(monitor.id, enabled);
    return enabled
      ? `▶️ «${esc(monitor.name)}» reanudado. La primera pasada marcará lo existente como visto.`
      : `⏸ «${esc(monitor.name)}» pausado.`;
  }

  toggleAll(enabled) {
    const changed = this.actions.setAllEnabled(enabled);
    if (!changed.length) return enabled ? 'Todos los monitores ya estaban activos.' : 'Todos los monitores ya estaban pausados.';
    const names = changed.map((m) => esc(m.name)).join(', ');
    return enabled ? `▶️ Reanudados ${changed.length}: ${names}` : `⏸ Pausados ${changed.length}: ${names}`;
  }

  setting(args, parse, usage) {
    const changes = args ? parse(args.trim()) : null;
    if (!changes) return { text: `${usage}\n\n${this.settingsText()}` };
    const { data, errors } = validateSettings(changes);
    if (errors.length) return { text: `❌ ${esc(errors.join('. '))}\n${usage}` };
    const before = this.store.getSettings();
    this.store.setSettings(data);
    if ('poll_interval_seconds' in data && data.poll_interval_seconds !== before.poll_interval_seconds) {
      this.scheduler.rescheduleAll();
    }
    return { text: `✅ Guardado.\n\n${this.settingsText()}` };
  }

  statusText() {
    const settings = this.store.getSettings();
    return views.statusText({
      monitors: this.store.listMonitors(),
      vinted: this.client.status(),
      counts: this.store.counts(),
      settings,
      quietNow: isQuietTime(settings, this.timezone, new Date(this.now())),
      clock: this.clock,
    });
  }

  foundText(monitor) {
    const rows = this.store.listFound({ monitorId: monitor?.id || null, limit: 10 });
    return views.foundText(rows, { monitorName: monitor?.name || null, now: this.now() });
  }

  settingsText() {
    const settings = this.store.getSettings();
    return views.settingsText({
      settings,
      defaultInterval: this.defaultIntervalSeconds,
      intervalSeconds: settings.poll_interval_seconds || this.defaultIntervalSeconds,
      timezone: this.timezone,
    });
  }

  logText(args) {
    const all = /^(todo|all|info)$/i.test(args || '');
    const rows = this.store.listLogs({ levels: all ? ['info', 'warn', 'error'] : ['warn', 'error'], limit: 15 });
    return views.logText(rows, this.clock) + (all ? '' : '\n\n<i>Solo avisos y errores. /registro todo para verlo completo.</i>');
  }

  status() {
    return { username: this.username, ...this.state };
  }
}

module.exports = { TelegramBot, COMMANDS: views.COMMANDS };
