# Vinted Sniper 🎯

Vigila búsquedas de Vinted y te manda un **aviso por Telegram** (con foto y botón «Ver en Vinted») en cuanto aparece un artículo nuevo que cumple tus filtros. **Solo avisa, no compra.** Los monitores se gestionan desde una web pensada para el móvil, y también se pueden pausar y consultar desde el propio bot.

- Backend: Node.js 22 + Express, un único proceso que sirve la web y ejecuta el monitor.
- Base de datos: SQLite (`better-sqlite3`).
- Avisos: API de bots de Telegram (sin dependencias extra; *long polling*, no necesita URL pública).
- Frontend: web sin framework, tema oscuro, pensada para móvil.

> Proyecto de uso personal. Respeta las condiciones de uso de Vinted y no bajes el intervalo de sondeo de forma agresiva.

---

## Índice

1. [Instalación](#instalación)
2. [Crear el bot de Telegram](#crear-el-bot-de-telegram)
3. [Ejecutar en local](#ejecutar-en-local)
4. [Desplegar](#desplegar)
5. [Avisos y comandos del bot](#avisos-y-comandos-del-bot)
6. [Crear monitores](#crear-monitores)
7. [Cómo funciona el motor](#cómo-funciona-el-motor)
8. [Estructura del código](#estructura-del-código)
9. [Problemas frecuentes](#problemas-frecuentes)

---

## Instalación

Requisitos: **Node.js 22 o superior** y npm.

```bash
git clone https://github.com/pertx1/vintedsniper.git
cd vintedsniper
npm install
cp .env.example .env
```

Edita `.env`:

| Variable | Descripción | Por defecto |
|---|---|---|
| `APP_PASSWORD` | Contraseña para entrar en la web. **Obligatoria.** | — |
| `TELEGRAM_BOT_TOKEN` | Token del bot que da @BotFather (ver abajo). **Secreto. Obligatorio para avisar.** | — |
| `TELEGRAM_CHAT_ID` | Tu chat ID. El bot solo envía avisos y responde a este chat. **Obligatorio.** | — |
| `VINTED_DOMAIN` | Dominio de Vinted que se consulta. | `www.vinted.es` |
| `POLL_INTERVAL_SECONDS` | Segundos entre comprobaciones de cada monitor (±20 % aleatorio). Editable desde Ajustes. | `45` |
| `VINTED_MIN_GAP_MS` | Pausa mínima entre dos peticiones a Vinted (de cualquier monitor). | `1500` |
| `TZ` | Zona horaria del horario silencioso y de las horas que muestra el bot. | `Europe/Madrid` |
| `PORT` / `HOST` | Puerto y dirección de escucha. | `3000` / `0.0.0.0` |
| `DB_PATH` | Ruta del fichero SQLite. | `./data/sniper.db` |
| `TRUST_PROXY` | Confiar en `X-Forwarded-*` de un proxy local (Caddy, cloudflared…). | `true` |

## Crear el bot de Telegram

1. **Crea el bot.** En Telegram abre [@BotFather](https://t.me/BotFather), envía `/newbot`, elige un nombre (p. ej. *Mi Sniper*) y un usuario que acabe en `bot` (p. ej. `mi_sniper_bot`). BotFather te responde con el **token**, algo como `123456789:AAH…`.
2. **Escribe a tu bot.** Ábrelo (el enlace `t.me/mi_sniper_bot` que te da BotFather) y pulsa **Iniciar** o envíale cualquier mensaje. Un bot no puede escribirte hasta que tú le hayas escrito primero.
3. **Consigue tu chat ID** (un número). Cualquiera de estas formas vale:
   - Escribe a [@userinfobot](https://t.me/userinfobot): te responde con tu **Id**.
   - O abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` (con tu token, **sin** los `<>`) y busca `"chat":{"id":123456789`. Hazlo antes de arrancar el sniper: cuando está en marcha, él consume esos mensajes y la lista sale vacía.
   - Si quieres los avisos en un **grupo**, añade el bot al grupo, escribe algo en él y usa el `id` del grupo (empieza por `-100…`).
4. **Ponlo en el `.env`:**
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:AAH...
   TELEGRAM_CHAT_ID=123456789
   ```
5. Arranca (o reinicia) la app y prueba con **Ajustes → Enviar aviso de prueba** o escribiendo `/test` al bot.

> 🔐 **El token da control total del bot.** Va solo en el `.env` (que está en `.gitignore`), nunca en el código. La app no lo escribe en el registro ni lo devuelve por la API: cualquier error que lo contenga se muestra como `bot***`. Si se te escapa, en @BotFather usa `/revoke` para generar uno nuevo y actualiza el `.env`.

## Ejecutar en local

```bash
npm start          # o "npm run dev" para recargar al editar
```

Abre <http://localhost:3000> e inicia sesión con `APP_PASSWORD`.

Los avisos de Telegram funcionan igual en local: el bot pregunta a Telegram por los mensajes nuevos (*long polling*), así que **no hace falta ninguna URL pública ni HTTPS** para recibir avisos ni usar los comandos. Solo un proceso por bot: si arrancas dos copias con el mismo token, Telegram rechaza la segunda (lo verás como error 409 en el registro).

Tests:

```bash
npm test
```

## Desplegar

Lo que necesita el sniper es **un proceso encendido 24/7 con disco**. HTTPS ya no es imprescindible para los avisos (van por Telegram), pero sí es muy recomendable si vas a abrir la web desde fuera de casa, porque protege la contraseña.

> ❌ **No funciona en Vercel, Netlify ni plataformas «serverless»**: el sniper necesita un proceso encendido 24/7 y un disco donde guardar la base de datos. Tampoco en planes gratuitos que apagan la app por inactividad (Render, Koyeb…).
>
> 💸 **Opción online y gratis:** sigue la guía [deploy/GRATIS-ORACLE.md](deploy/GRATIS-ORACLE.md) (Oracle Cloud Always Free + DuckDNS, instalación con un solo script).

Hay dos caminos. **Recomendado: la opción A**, porque Vinted bloquea con frecuencia las IPs de centros de datos (VPS) con 403, y desde una conexión doméstica eso pasa mucho menos.

### Opción A — Ordenador o Raspberry Pi en casa + Cloudflare Tunnel (sin abrir puertos)

1. Instala Node 22 y el proyecto como en [Instalación](#instalación). Déjalo corriendo como servicio (ver *systemd* abajo) o con Docker.
2. Necesitas un dominio gestionado en Cloudflare (vale uno barato).
3. Instala `cloudflared` y crea el túnel:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create sniper
   cloudflared tunnel route dns sniper sniper.tudominio.com
   ```
4. Crea `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: sniper
   credentials-file: /home/TU_USUARIO/.cloudflared/<ID-DEL-TUNEL>.json
   ingress:
     - hostname: sniper.tudominio.com
       service: http://localhost:3000
     - service: http_status:404
   ```
5. `sudo cloudflared service install` para que arranque solo.

Ya tienes `https://sniper.tudominio.com` con certificado válido.

*Alternativa sin dominio propio:* **Tailscale Funnel** (`tailscale funnel 3000`) te da una URL `https://<maquina>.<tailnet>.ts.net` pública con HTTPS.

### Opción B — VPS con Caddy (HTTPS automático con Let's Encrypt)

1. Apunta un registro DNS `A` (`sniper.tudominio.com`) a la IP del VPS y abre los puertos 80 y 443.
2. Arranca la app (Docker o systemd) escuchando solo en local, en el puerto 3000.
3. Instala [Caddy](https://caddyserver.com/docs/install) y usa `Caddyfile.example` como `/etc/caddy/Caddyfile`:
   ```
   sniper.tudominio.com {
       encode gzip
       reverse_proxy 127.0.0.1:3000
   }
   ```
4. `sudo systemctl reload caddy`. Caddy obtiene y renueva el certificado solo.

> Si Vinted responde 403 a menudo desde el VPS (lo verás como «Limitado» en los monitores y en el registro), la solución práctica es pasar a la opción A.

### Con Docker

```bash
cp .env.example .env    # y rellénalo
mkdir -p data && sudo chown 1000:1000 data   # el contenedor corre como usuario "node"
docker compose up -d --build
```

`docker-compose.yml` publica el puerto solo en `127.0.0.1:3000`, listo para poner Caddy o cloudflared delante.

### Con systemd (sin Docker)

`/etc/systemd/system/vinted-sniper.service`:

```ini
[Unit]
Description=Vinted Sniper
After=network-online.target

[Service]
WorkingDirectory=/home/TU_USUARIO/vintedsniper
ExecStart=/usr/bin/node src/server.js
Restart=always
User=TU_USUARIO
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vinted-sniper
journalctl -u vinted-sniper -f
```

## Avisos y comandos del bot

Cada artículo nuevo llega como **foto con pie de texto**:

```
Nike · Dunk Low Panda
💶 45,00 € (48,05 € con protección)
📏 Talla 42 · ✨ Muy bueno
🎯 Dunks · publicado hace 2 min
[ Ver en Vinted ]
```

- El botón **Ver en Vinted** abre el artículo (en la app de Vinted si la tienes).
- Si Telegram no puede descargar la foto, se envía el mismo aviso **solo con texto**.
- Si Telegram responde **429** (demasiados mensajes), se espera el tiempo que indica (`retry_after`) y se reintenta hasta 3 veces. Además, los envíos se espacian al menos 1,1 s.
- **Horario silencioso** (Ajustes): en ese tramo los avisos llegan igual, pero **sin sonido**.
- El **interruptor general** de Ajustes corta todos los avisos (los artículos se siguen guardando en «Encontrados»).

### Comandos

El bot **solo responde a `TELEGRAM_CHAT_ID`**; los mensajes de cualquier otro chat se ignoran sin contestar.

| Comando | |
|---|---|
| `/estado` | Estado de Vinted, encontrados en 24 h y, por monitor, OK / limitado / error / pausado con la hora de la última comprobación |
| `/monitores` | Lista con número, nombre y precio máximo (y mínimo si lo hay) |
| `/pausar <nombre>` | Pausa un monitor. Vale el nombre completo o una parte única, sin importar mayúsculas ni acentos, o su número (`/pausar 3`). Si hay varios que encajan, no toca ninguno y te los lista |
| `/reanudar <nombre>` | Lo reanuda; la primera pasada vuelve a marcar lo existente como visto, sin avisar |
| `/pausartodo`, `/reanudartodo` | Todos a la vez |
| `/test` | Envía un aviso de prueba con el último artículo encontrado (o un ejemplo si aún no hay ninguno) |
| `/ayuda` | Lista de comandos |

Los comandos que se envían mientras la app está apagada se ignoran si tienen más de 10 minutos, para que un `/pausartodo` antiguo no se ejecute por sorpresa al arrancar.

La web se puede seguir añadiendo a la pantalla de inicio del móvil como acceso directo (Safari → Compartir → Añadir a pantalla de inicio).

## Crear monitores

### Pegando una URL de Vinted (forma principal)

1. En vinted.es configura la búsqueda: categoría, marcas, tallas, estado, precio, color…
2. Copia la URL (en la app de Vinted: Compartir → Copiar enlace).
3. En Sniper: **+ Nuevo → pega la URL → Extraer filtros**.
4. Comprueba el **precio máximo** (obligatorio), añade un **precio mínimo** si quieres evitar falsificaciones y **palabras excluidas** (`réplica, fake, caja…`).

Se extraen `catalog[]`, `brand_ids[]`, `size_ids[]`, `status_ids[]`, `price_from`, `price_to` y `search_text`. Otros filtros (`color_ids`, `material_ids`…) se conservan y se envían tal cual. El orden siempre se fuerza a «más recientes».

### Formulario manual

Tipo (zapatillas, calzado, ropa), género y subcategoría se traducen a IDs de categoría con la tabla de `src/vinted/catalogs.js`. Marcas y tallas se indican por ID; lo más cómodo es pegar una URL. Si Vinted cambia algún ID de categoría, corrígelo en ese fichero.

### Detalles

- **Estado del artículo**: 6 = nuevo con etiquetas, 1 = nuevo sin etiquetas, 2 = muy bueno, 3 = bueno, 4 = satisfactorio.
- **Precio**: los filtros se aplican al precio del artículo, **sin** la protección al comprador. En «Encontrados» se muestra también el total.
- **Palabras excluidas**: palabra completa, sin distinguir mayúsculas ni acentos («replica» descarta «Réplica», pero «rep» no descarta «repasado»). Se buscan en título y marca; si marcas «Buscar también en la descripción», se hace una petición extra por cada artículo nuevo que pase los demás filtros.
- **Primera pasada**: al crear, editar o reactivar un monitor, todo lo que hay en ese momento se marca como visto **sin notificar**. Solo te avisa de lo que aparezca después.
- Si un artículo encaja en varios monitores, **se notifica una sola vez** y en «Encontrados» aparece con todos sus monitores.
- **Antigüedad máxima** (Ajustes, 24 h por defecto): descarta artículos antiguos que aparecen como nuevos por haber sido «subidos» o promocionados.

## Cómo funciona el motor

- **Sesión**: el cliente visita primero `https://www.vinted.es/` como lo haría un navegador y guarda las cookies que devuelve (sobre todo `access_token_web`). Con ellas llama al mismo endpoint interno que usa la web del catálogo:
  `GET /api/v2/catalog/items?page=1&per_page=96&order=newest_first&search_text=…&catalog_ids=…&brand_ids=…&size_ids=…&status_ids=…&price_from=…&price_to=…`
- **401** → vuelve a visitar la página principal para renovar la sesión y reintenta una vez.
- **403 / 429** → Vinted nos está frenando. Se aplica una **pausa global** (afecta a toda la IP) con backoff exponencial: 1, 2, 4, 8… minutos, con un máximo de 30 (o lo que diga `Retry-After` si es mayor). Los monitores se muestran como **Limitado**. Tras un 403 se descartan las cookies y se empieza con sesión nueva.
- **Otros errores** (red, 5xx) → el monitor pasa a **Error** y reintenta con backoff propio (máximo 10 minutos).
- **Sondeo**: cada monitor tiene su propio temporizador (intervalo ±20 %). Al arrancar se reparten a lo largo del intervalo y todas las peticiones pasan por una cola con al menos `VINTED_MIN_GAP_MS` entre ellas, así que nunca salen todas a la vez.
- **Vistos**: los IDs vistos se guardan por monitor en SQLite y se marcan **antes** de notificar, así que un reinicio nunca provoca avisos duplicados. Se olvidan a los 30 días sin aparecer en los resultados.
- **Telegram**: los avisos salen por una cola con al menos 1,1 s entre mensajes y reintento con `retry_after` ante un 429. Los comandos se leen con `getUpdates` (*long polling*), guardando en SQLite el último mensaje procesado para no repetir ninguno tras un reinicio.
- **Registro**: avisos y errores se guardan en la tabla `logs` (últimas 2000 entradas) y se ven en **Ajustes → Registro**.

> El endpoint interno de Vinted no es una API pública y puede cambiar sin aviso. Si un día todo da error, mira el registro: los cambios suelen estar en `src/vinted/client.js`.

## Estructura del código

```
src/
  server.js            arranque: Express + monitor en el mismo proceso
  config.js            variables de entorno (.env)
  db.js                esquema SQLite y migraciones
  store.js             acceso a datos (monitores, vistos, encontrados, ajustes)
  logger.js            log a consola + tabla logs
  vinted/
    client.js          sesión con cookies, búsqueda, 401/403/429, backoff global
    url-parser.js      URL de Vinted → filtros
    catalogs.js        tabla de categorías para el formulario manual
  monitor/
    scheduler.js       sondeo escalonado, primera pasada, deduplicado, estados
    filters.js         precio, palabras excluidas, antigüedad
    actions.js         pausar/reanudar y búsqueda por nombre (web y bot)
  telegram/
    api.js             cliente de la API de bots: cola, 429/retry_after, token oculto en errores
    notifier.js        aviso con foto + botón, caída a texto, horario silencioso, prueba
    bot.js             comandos (/estado, /pausar…) por long polling, solo tu chat
    quiet-hours.js     cálculo del horario silencioso por zona horaria
  api/
    auth.js            login con contraseña + cookie de sesión (SQLite)
    routes.js          API REST
public/                web: index.html, app.js, styles.css, manifest.json, icons/
scripts/               generate-icons.js
test/                  tests (node:test) con Vinted y Telegram simulados
```

### API (todas bajo `/api`, requieren sesión salvo login)

| Método | Ruta | |
|---|---|---|
| POST | `/login`, `/logout` | Sesión |
| GET/POST | `/monitors` | Listar / crear |
| PUT/DELETE | `/monitors/:id` | Editar / borrar |
| POST | `/monitors/:id/toggle`, `/monitors/:id/run` | Pausar-reanudar / comprobar ahora |
| POST | `/parse-url` | Extraer filtros de una URL de Vinted |
| GET | `/found?monitor_id=&before=&limit=` | Feed de encontrados |
| GET/PUT | `/settings` | Ajustes |
| GET | `/status`, `/logs` | Estado del sistema y registro |
| POST | `/telegram/test` | Enviar aviso de prueba |

## Problemas frecuentes

- **«Telegram sendMessage: 401 Unauthorized»**: el token está mal copiado o lo revocaste. Cópialo otra vez de @BotFather.
- **«400 Bad Request: chat not found»**: el `TELEGRAM_CHAT_ID` no es correcto, o nunca le has escrito al bot. Escríbele `/start` y comprueba el número.
- **«403 Forbidden: bot was blocked by the user»**: has bloqueado el bot en Telegram; desbloquéalo desde su chat.
- **«409 Conflict» al leer comandos**: hay otra copia de la app usando el mismo token, o un webhook configurado. Para la otra copia (la app borra el webhook al arrancar).
- **Llegan avisos pero el bot no contesta a los comandos**: mira que escribes desde el chat de `TELEGRAM_CHAT_ID` (desde otro chat se ignoran a propósito) y el estado del bot en Ajustes.
- **Los avisos no suenan**: revisa el horario silencioso en Ajustes y que el chat del bot no esté silenciado en Telegram.
- **Monitores en «Limitado» todo el rato**: sube el intervalo (60–90 s), reduce el número de monitores o ejecuta la app desde una IP doméstica.
- **«La página principal no devolvió access_token_web»** en el registro: Vinted ha cambiado algo o te está mostrando un reto anti-bot. Prueba a cambiar `VINTED_USER_AGENT` o la IP.
