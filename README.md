# Vinted Sniper 🎯

Bot de Telegram que vigila búsquedas de Vinted y te avisa **al instante** (con foto y botón «Ver en Vinted») cuando aparece un artículo nuevo que cumple tus filtros. **Todo se maneja desde el chat del bot**: crear monitores pegando una URL de Vinted, editarlos, pausarlos, ver lo encontrado y cambiar los ajustes. **Solo avisa, no compra.**

- Node.js 22, un único proceso que vigila Vinted y atiende el bot.
- SQLite (`better-sqlite3`) para monitores, artículos vistos y encontrados.
- API de bots de Telegram por *long polling*: **no abre ningún puerto** ni necesita dominio o HTTPS.

> Proyecto de uso personal. Respeta las condiciones de uso de Vinted y no bajes el intervalo de sondeo de forma agresiva.

---

## Índice

1. [Crear el bot de Telegram](#crear-el-bot-de-telegram)
2. [Instalación y arranque](#instalación-y-arranque)
3. [Desplegar 24/7](#desplegar-247)
4. [Usar el bot](#usar-el-bot)
5. [Cómo funciona el motor](#cómo-funciona-el-motor)
6. [Estructura del código](#estructura-del-código)
7. [Problemas frecuentes](#problemas-frecuentes)

---

## Crear el bot de Telegram

1. **Crea el bot.** En Telegram abre [@BotFather](https://t.me/BotFather), envía `/newbot`, elige un nombre (p. ej. *Mi Sniper*) y un usuario que acabe en `bot` (p. ej. `mi_sniper_bot`). BotFather te responde con el **token**, algo como `123456789:AAH…`.
2. **Escribe a tu bot.** Ábrelo (el enlace `t.me/mi_sniper_bot` que te da BotFather) y pulsa **Iniciar** o envíale cualquier mensaje. Un bot no puede escribirte hasta que tú le hayas escrito primero.
3. **Consigue tu chat ID** (un número). Cualquiera de estas formas vale:
   - Escribe a [@userinfobot](https://t.me/userinfobot): te responde con tu **Id**.
   - O abre en el navegador `https://api.telegram.org/bot<TOKEN>/getUpdates` (con tu token, **sin** los `<>`) y busca `"chat":{"id":123456789`. Hazlo antes de arrancar el sniper: cuando está en marcha, él consume esos mensajes y la lista sale vacía.
   - Si quieres usarlo en un **grupo**, añade el bot al grupo, escribe algo en él y usa el `id` del grupo (empieza por `-100…`).

> 🔐 **El token da control total del bot.** Va solo en el `.env` (que está en `.gitignore`), nunca en el código. La app no lo escribe en el registro: cualquier error que lo contenga se muestra como `bot***`. Si se te escapa, en @BotFather usa `/revoke` para generar uno nuevo y actualiza el `.env`.

## Instalación y arranque

Requisitos: **Node.js 22 o superior** y npm.

```bash
git clone https://github.com/pertx1/vintedsniper.git
cd vintedsniper
npm install
cp .env.example .env     # y rellena TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID
npm start                # o "npm run dev" para recargar al editar
```

Escribe `/start` a tu bot y pega una URL de búsqueda de Vinted para crear el primer monitor.

| Variable | Descripción | Por defecto |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Token del bot que da @BotFather. **Secreto. Obligatorio.** | — |
| `TELEGRAM_CHAT_ID` | Tu chat ID. El bot solo responde a este chat y solo le envía avisos a él. **Obligatorio.** | — |
| `VINTED_DOMAIN` | Dominio de Vinted que se consulta. | `www.vinted.es` |
| `POLL_INTERVAL_SECONDS` | Segundos entre comprobaciones de cada monitor (±20 % aleatorio). Se cambia también con `/intervalo`. | `45` |
| `VINTED_MIN_GAP_MS` | Pausa mínima entre dos peticiones a Vinted (de cualquier monitor). | `1500` |
| `TZ` | Zona horaria del horario silencioso y de las horas que muestra el bot. | `Europe/Madrid` |
| `DB_PATH` | Ruta del fichero SQLite. | `./data/sniper.db` |

Si falta el token o el chat ID, la app no arranca y te dice qué falta.

**Solo un proceso por bot**: si arrancas dos copias con el mismo token, Telegram rechaza la segunda (lo verás como error 409 en el registro).

Tests: `npm test`.

## Desplegar 24/7

El sniper necesita **un proceso encendido todo el tiempo y un disco** para la base de datos. Como solo hace conexiones de salida (a Telegram y a Vinted), vale cualquier máquina con internet: no hace falta dominio, HTTPS ni abrir puertos.

> ❌ **No funciona en Vercel, Netlify ni plataformas «serverless»**, ni en planes gratuitos que apagan la app por inactividad (Render, Koyeb…).

- **Gratis online:** Oracle Cloud Always Free, con un script que lo instala todo → [deploy/GRATIS-ORACLE.md](deploy/GRATIS-ORACLE.md).
- **En casa** (ordenador o Raspberry Pi que esté siempre encendido): es la mejor opción contra bloqueos, porque Vinted limita mucho menos las IPs domésticas que las de centros de datos. El mismo script vale para cualquier Ubuntu/Debian/Raspberry Pi OS:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/pertx1/vintedsniper/claude/charming-mayer-9520k7/deploy/setup-vps.sh -o setup.sh
  sudo bash setup.sh       # pide el token (sin mostrarlo) y el chat ID
  ```
  Para actualizar: `sudo bash /opt/vintedsniper/deploy/update.sh`.

### Con Docker

```bash
cp .env.example .env    # y rellénalo
mkdir -p data && sudo chown 1000:1000 data   # el contenedor corre como usuario "node"
docker compose up -d --build
docker compose logs -f
```

### Con systemd (a mano)

`/etc/systemd/system/vinted-sniper.service`:

```ini
[Unit]
Description=Vinted Sniper
After=network-online.target

[Service]
WorkingDirectory=/home/TU_USUARIO/vintedsniper
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
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

## Usar el bot

El bot **solo responde a `TELEGRAM_CHAT_ID`**. Los mensajes y botones de cualquier otro chat se ignoran sin contestar.

### Crear un monitor (pegando una URL)

1. En la web o la app de Vinted haz la búsqueda y aplica los filtros: categoría, marcas, tallas, estado, precio, color…
2. Copia el enlace (en la app: **Compartir → Copiar enlace**).
3. **Pégalo en el chat del bot.** Te enseña los filtros que ha entendido y te pregunta, con botones para lo opcional:
   1. **Nombre**, con un botón para usar el texto de búsqueda.
   2. **Precio máximo** (obligatorio), con un botón para usar el de la URL si lo tiene.
   3. **Precio mínimo** (opcional, para evitar falsificaciones) o «Sin mínimo».
   4. **Palabras excluidas** separadas por comas (`réplica, fake, caja`) o «Ninguna». Si pones alguna, te pregunta si buscarlas también en la descripción.
   5. **Resumen** con los botones ✅ Crear / ❌ Cancelar.

Se extraen `catalog[]`, `brand_ids[]`, `size_ids[]`, `status_ids[]`, `price_from`, `price_to` y `search_text`. Otros filtros (`color_ids`, `material_ids`…) se conservan y se envían tal cual. El orden siempre se fuerza a «más recientes». Puedes salir en cualquier momento con `/cancelar`.

### Avisos

```
Nike · Dunk Low Panda
💶 45,00 € (48,05 € con protección)
📏 Talla 42 · ✨ Muy bueno
🎯 Dunks · publicado hace 2 min
[ Ver en Vinted ]
```

- El botón **Ver en Vinted** abre el artículo (en la app de Vinted si la tienes).
- Si Telegram no puede descargar la foto, llega el mismo aviso **solo con texto**.
- Si Telegram responde **429** (demasiados mensajes), se espera el tiempo que indica (`retry_after`) y se reintenta hasta 3 veces. Además, los mensajes se espacian al menos 1,1 s.
- En el **horario silencioso** los avisos llegan igual, pero **sin sonido**.

### Comandos

| Comando | |
|---|---|
| *(pegar una URL de Vinted)* | Crear un monitor |
| `/nuevo` | Explica cómo crear un monitor |
| `/monitores` | Lista con precio; cada monitor tiene un botón que abre su ficha |
| `/ver <nombre>` | Ficha del monitor, con botones: ⏸ Pausar / ▶️ Reanudar · 🔄 Comprobar ahora · ✏️ Editar · ⭐ Encontrados · 🗑 Borrar |
| `/editar <nombre>` | Cambiar nombre, precio máximo, precio mínimo, palabras excluidas, buscar en la descripción sí/no, o pegar una URL nueva (sustituye los filtros de Vinted) |
| `/borrar <nombre>` | Borra el monitor, tras confirmar con un botón |
| `/pausar <nombre>` · `/reanudar <nombre>` | Pausa o reanuda uno |
| `/pausartodo` · `/reanudartodo` | Todos a la vez |
| `/estado` | Estado de Vinted, encontrados en 24 h y, por monitor, OK / limitado / error / pausado con la hora de la última comprobación |
| `/encontrados [nombre]` | Los 10 últimos artículos encontrados (de todos o de un monitor), con enlace |
| `/ajustes` | Muestra los ajustes actuales |
| `/avisos on\|off` | Interruptor general de avisos (lo encontrado se sigue guardando) |
| `/silencio 00:00-08:00` · `/silencio off` | Horario silencioso: avisos sin sonido |
| `/intervalo 60` · `/intervalo auto` | Segundos entre comprobaciones (15–3600); `auto` vuelve al valor del `.env` |
| `/antiguedad 24` | Ignora artículos publicados hace más de N horas (0 = sin límite) |
| `/registro` · `/registro todo` | Últimos avisos y errores del sistema (o todo) |
| `/test` | Aviso de prueba con el último artículo encontrado (o un ejemplo si aún no hay ninguno) |
| `/cancelar` | Cancela lo que estés creando o editando |
| `/ayuda` | Lista de comandos |

**Nombres:** en todos los comandos con `<nombre>` vale el nombre completo o una parte única, sin importar mayúsculas ni acentos, o el número del monitor (`/pausar 3`). Si varios encajan, el bot no toca ninguno y te los lista. No se permiten dos monitores con el mismo nombre.

**Comandos antiguos:** los que se enviaron mientras la app estaba apagada se ignoran si tienen más de 10 minutos, para que un `/pausartodo` viejo no se ejecute por sorpresa al arrancar.

### Detalles de los filtros

- **Precio**: se aplica al precio del artículo, **sin** la protección al comprador; el aviso muestra también el total.
- **Palabras excluidas**: palabra completa, sin distinguir mayúsculas ni acentos («replica» descarta «Réplica», pero «rep» no descarta «repasado»). Se buscan en título y marca, y en la descripción si lo activas (una petición extra a Vinted por cada artículo nuevo que pase los demás filtros).
- **Primera pasada**: al crear o reactivar un monitor, o al cambiar su búsqueda (URL o precios), todo lo que hay en ese momento se marca como visto **sin avisar**. Cambiar el nombre o las palabras excluidas no la repite.
- Si un artículo encaja en varios monitores, **se avisa una sola vez**.
- **Antigüedad máxima** (24 h por defecto): descarta artículos antiguos que aparecen como nuevos por haber sido «subidos» o promocionados.

## Cómo funciona el motor

- **Sesión en Vinted**: el cliente visita primero `https://www.vinted.es/` como lo haría un navegador y guarda las cookies que devuelve (sobre todo `access_token_web`). Con ellas llama al mismo endpoint interno que usa la web del catálogo:
  `GET /api/v2/catalog/items?page=1&per_page=96&order=newest_first&search_text=…&catalog_ids=…&brand_ids=…&size_ids=…&status_ids=…&price_from=…&price_to=…`
- **401** → vuelve a visitar la página principal para renovar la sesión y reintenta una vez.
- **403 / 429** → Vinted nos está frenando. Se aplica una **pausa global** (afecta a toda la IP) con backoff exponencial: 1, 2, 4, 8… minutos, con un máximo de 30 (o lo que diga `Retry-After` si es mayor). Los monitores salen como «limitado» en `/estado`. Tras un 403 se descartan las cookies y se empieza con sesión nueva.
- **Otros errores** (red, 5xx) → el monitor pasa a «error» y reintenta con backoff propio (máximo 10 minutos).
- **Sondeo**: cada monitor tiene su propio temporizador (intervalo ±20 %). Al arrancar se reparten a lo largo del intervalo y todas las peticiones pasan por una cola con al menos `VINTED_MIN_GAP_MS` entre ellas, así que nunca salen todas a la vez.
- **Vistos**: los IDs vistos se guardan por monitor en SQLite y se marcan **antes** de avisar, así que un reinicio nunca provoca avisos duplicados. Se olvidan a los 30 días sin aparecer en los resultados.
- **Telegram**: los comandos y botones se leen con `getUpdates` (*long polling*); el último mensaje procesado se guarda en SQLite para no repetir ninguno tras un reinicio. Los avisos salen por una cola con al menos 1,1 s entre mensajes y reintento con `retry_after` ante un 429.
- **Registro**: avisos y errores se guardan en la tabla `logs` (últimas 2000 entradas); se consultan con `/registro` o con `journalctl`.

> El endpoint interno de Vinted no es una API pública y puede cambiar sin aviso. Si un día todo da error, mira `/registro`: los cambios suelen estar en `src/vinted/client.js`.

## Estructura del código

```
src/
  index.js             arranque: conecta el monitor y el bot (sin servidor web)
  config.js            variables de entorno (.env) y validación
  db.js                esquema SQLite y migraciones
  store.js             acceso a datos (monitores, vistos, encontrados, ajustes, registro)
  logger.js            log a consola + tabla logs
  vinted/
    client.js          sesión con cookies, búsqueda, 401/403/429, backoff global
    url-parser.js      URL de Vinted → filtros
    conditions.js      IDs de estado del artículo (nuevo con etiquetas, muy bueno…)
  monitor/
    scheduler.js       sondeo escalonado, primera pasada, deduplicado, estados
    filters.js         precio, palabras excluidas, antigüedad
    validation.js      validación de monitores y ajustes
    actions.js         crear, editar, borrar, pausar/reanudar, buscar por nombre
  telegram/
    api.js             cliente de la API de bots: cola, 429/retry_after, token oculto en errores
    notifier.js        aviso con foto + botón, caída a texto, horario silencioso, prueba
    bot.js             comandos y botones por long polling, solo tu chat
    wizard.js          conversaciones: crear un monitor desde una URL, editar campos
    views.js           textos y teclados del bot
    quiet-hours.js     cálculo del horario silencioso por zona horaria
deploy/                script de instalación (systemd) y guía de Oracle Cloud
test/                  tests (node:test) con Vinted y Telegram simulados
```

## Problemas frecuentes

- **La app no arranca y dice «Falta TELEGRAM_BOT_TOKEN» o «formato»**: revisa el `.env`.
- **«Telegram …: 401 Unauthorized»**: el token está mal copiado o lo revocaste. Cópialo otra vez de @BotFather.
- **«400 Bad Request: chat not found»**: el `TELEGRAM_CHAT_ID` no es correcto, o nunca le has escrito al bot. Escríbele `/start` y comprueba el número.
- **«403 Forbidden: bot was blocked by the user»**: has bloqueado el bot en Telegram; desbloquéalo desde su chat.
- **«409 Conflict» al leer comandos**: hay otra copia de la app usando el mismo token, o un webhook configurado. Para la otra copia (la app borra el webhook al arrancar).
- **El bot no contesta pero los avisos llegan**: escribe desde el chat de `TELEGRAM_CHAT_ID` (desde otro chat se ignora a propósito).
- **Los avisos no suenan**: revisa `/ajustes` (horario silencioso) y que el chat del bot no esté silenciado en Telegram.
- **Monitores «limitado» todo el rato**: sube el intervalo (`/intervalo 90`), reduce el número de monitores o ejecuta la app desde una IP doméstica.
- **«La página principal no devolvió access_token_web»** en `/registro`: Vinted ha cambiado algo o te está mostrando un reto anti-bot. Prueba a cambiar `VINTED_USER_AGENT` o la IP.
