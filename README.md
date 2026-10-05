# Vinted Sniper 🎯

Vigila búsquedas de Vinted y te manda una **notificación push al iPhone** (o a cualquier navegador) en cuanto aparece un artículo nuevo que cumple tus filtros. **Solo avisa, no compra.**

- Backend: Node.js 22 + Express, un único proceso que sirve la web y ejecuta el monitor.
- Base de datos: SQLite (`better-sqlite3`).
- Push: `web-push` con claves VAPID.
- Frontend: PWA sin framework, tema oscuro, pensada para móvil.

> Proyecto de uso personal. Respeta las condiciones de uso de Vinted y no bajes el intervalo de sondeo de forma agresiva.

---

## Índice

1. [Instalación](#instalación)
2. [Claves VAPID](#claves-vapid)
3. [Ejecutar en local](#ejecutar-en-local)
4. [Desplegar con HTTPS](#desplegar-con-https)
5. [Activar las notificaciones en el iPhone](#activar-las-notificaciones-en-el-iphone)
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
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Claves de Web Push (ver abajo). **Obligatorias para notificar.** | — |
| `VAPID_SUBJECT` | `mailto:` de contacto que se envía al servicio push de Apple/Google. | `mailto:admin@example.com` |
| `VINTED_DOMAIN` | Dominio de Vinted que se consulta. | `www.vinted.es` |
| `POLL_INTERVAL_SECONDS` | Segundos entre comprobaciones de cada monitor (±20 % aleatorio). Editable desde Ajustes. | `45` |
| `VINTED_MIN_GAP_MS` | Pausa mínima entre dos peticiones a Vinted (de cualquier monitor). | `1500` |
| `TZ` | Zona horaria del horario silencioso. | `Europe/Madrid` |
| `PORT` / `HOST` | Puerto y dirección de escucha. | `3000` / `0.0.0.0` |
| `DB_PATH` | Ruta del fichero SQLite. | `./data/sniper.db` |
| `TRUST_PROXY` | Confiar en `X-Forwarded-*` de un proxy local (Caddy, cloudflared…). | `true` |

## Claves VAPID

Las notificaciones Web Push necesitan un par de claves VAPID. Genéralas **una sola vez**:

```bash
npm run vapid
```

Copia las tres líneas que imprime en tu `.env`. No las cambies después: si lo haces, todas las suscripciones existentes dejan de funcionar y tendrás que volver a pulsar «Activar notificaciones» en cada dispositivo.

## Ejecutar en local

```bash
npm start          # o "npm run dev" para recargar al editar
```

Abre <http://localhost:3000> e inicia sesión con `APP_PASSWORD`.

En `localhost` el navegador del ordenador ya permite push (Chrome/Firefox/Safari en macOS), así que puedes probar todo menos el iPhone. **El iPhone exige HTTPS con un certificado válido**, así que para él necesitas uno de los despliegues de abajo.

Tests:

```bash
npm test
```

## Desplegar con HTTPS

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

## Activar las notificaciones en el iPhone

Requiere **iOS 16.4 o superior**.

1. Abre `https://sniper.tudominio.com` en **Safari**.
2. Botón **Compartir** → **Añadir a pantalla de inicio**.
3. Abre **Sniper** desde el icono e inicia sesión. La app instalada tiene sus propias cookies, así que hay que entrar otra vez aunque ya lo hicieras en Safari.
4. **Ajustes → Activar notificaciones** y acepta el permiso. iOS solo muestra el permiso si lo pides pulsando un botón, por eso no se pide al abrir.
5. **Enviar notificación de prueba**.

Las notificaciones muestran marca y título; el texto lleva precio (y total con protección al comprador), talla, estado y nombre del monitor. Al tocarlas se abre el artículo en Vinted. **iOS no muestra imágenes en las notificaciones web**; la foto se ve en «Encontrados» (y sí aparece en Android o en el escritorio).

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
- **Horario silencioso**: durante el silencio no se envían avisos, pero los artículos se guardan en «Encontrados». Al terminar, opcionalmente se envía un resumen («5 artículos nuevos durante el horario silencioso»).
- **Push**: las suscripciones se guardan en SQLite; las que el servicio push responde con 404/410 se borran automáticamente.
- **Registro**: avisos y errores se guardan en la tabla `logs` (últimas 2000 entradas) y se ven en **Ajustes → Registro**.

> El endpoint interno de Vinted no es una API pública y puede cambiar sin aviso. Si un día todo da error, mira el registro: los cambios suelen estar en `src/vinted/client.js`.

## Estructura del código

```
src/
  server.js            arranque: Express + monitor en el mismo proceso
  config.js            variables de entorno (.env)
  db.js                esquema SQLite y migraciones
  store.js             acceso a datos (monitores, vistos, encontrados, ajustes, suscripciones)
  logger.js            log a consola + tabla logs
  vinted/
    client.js          sesión con cookies, búsqueda, 401/403/429, backoff global
    url-parser.js      URL de Vinted → filtros
    catalogs.js        tabla de categorías para el formulario manual
  monitor/
    scheduler.js       sondeo escalonado, primera pasada, deduplicado, estados
    filters.js         precio, palabras excluidas, antigüedad
  push/
    push.js            web-push, limpieza 404/410, resumen del silencio
    quiet-hours.js     cálculo del horario silencioso por zona horaria
  api/
    auth.js            login con contraseña + cookie de sesión (SQLite)
    routes.js          API REST
public/                PWA: index.html, app.js, styles.css, sw.js, manifest.json, icons/
scripts/               generate-vapid.js, generate-icons.js
test/                  tests (node:test) con Vinted y push simulados
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
| GET/POST | `/push/public-key`, `/push/subscribe`, `/push/unsubscribe`, `/push/test` | Web Push |

## Problemas frecuentes

- **No aparece el botón de permiso en iPhone**: la web tiene que estar abierta desde el icono de la pantalla de inicio, no desde Safari. Comprueba también que la versión de iOS es 16.4 o superior.
- **«No hay ningún dispositivo suscrito» al probar**: pulsa antes «Activar notificaciones» en ese dispositivo.
- **Las notificaciones dejaron de llegar**: en iPhone, Ajustes → Notificaciones → Sniper. Revisa también los modos de Concentración. Si cambiaste las claves VAPID, vuelve a activar las notificaciones.
- **Monitores en «Limitado» todo el rato**: sube el intervalo (60–90 s), reduce el número de monitores o ejecuta la app desde una IP doméstica.
- **«La página principal no devolvió access_token_web»** en el registro: Vinted ha cambiado algo o te está mostrando un reto anti-bot. Prueba a cambiar `VINTED_USER_AGENT` o la IP.
