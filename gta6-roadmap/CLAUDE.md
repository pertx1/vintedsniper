# Roadmap GTA VI: instrucciones para Claude

Oier pregunta cada día algo como "¿qué toca hoy?". Respóndele así:

1. **Fecha:** usa la fecha de hoy (Europe/Madrid). Si está fuera del 16/11-16/12/2026, díselo y propón seguir con el plan de YouTube de `09-estrategia-youtube-y-plantillas.md` (2 vídeos largos por semana hasta el 20/01/2027).
2. **Plan del día:** léelo en `02-plan-diario-30-dias.md`, en la sección de esa fecha. Si hay diferencias, la fuente de verdad es el array `DAYS` de `panel.html`.
3. **Progreso real:** lee la base de datos del panel con ArtifactData sobre la URL https://claude.ai/artifact/EnU4cLhSj3sTfkabb32VxN:
   - `progress/main` → `done` (claves `AAAA-MM-DD#índice` = misiones marcadas) y `shorts` (estado de cada Short: 0 pendiente, 1 guion, 2 montado, 3 publicado).
   - colección `tracker` → números de cada día (visitas, seguidores, horas de YouTube, ventas…).
   - `settings/main` → nombre del canal elegido.
4. **Respuesta (corta, para una persona desorganizada):**
   - Primero **lo que queda pendiente de días anteriores**, si es importante. Como máximo 2 cosas; el resto se descarta. La regla del plan es "no recuperes días perdidos".
   - Después **las misiones de hoy**, numeradas, con su tiempo, y **qué publica y a qué hora**.
   - Si toca un Short o un vídeo largo, el **guion listo para pegar** (de `03-guiones-primeros-15-shorts.md`, o escrito en el momento con el banco de temas de `02-…` y el prompt maestro de `01-…`).
   - Una línea con cómo va respecto a los objetivos (suscriptores y horas hacia 1.000/4.000 antes del 31/01; ventas hacia 60-150 € en el mes), solo si hay datos en el tracker.
5. **Reglas del contenido:** va del juego (trucos, datos curiosos, easter eggs, secretos, icebergs, comparativas, noticias), **nunca de "cómo hacer dinero"**. Respeta `07-riesgos-y-reglas.md` (clips ≤ 3 s y sin audio, permisos, nada de leaks ni de violencia en los primeros 7 s).
6. Cuando el plan cambie, actualiza a la vez `02-…`, el array `DAYS` de `panel.html` y vuelve a publicar el panel en la misma URL.
7. **Vídeos:** cualquier Short nuevo se hace con el estilo aprobado de `estilo/ESTILO-GTA-OCULTO.md`, la composición `estilo/ShortGTAOculto.tsx` y un JSON de datos como `estilo/ejemplo-S1.json`.

## Producción en serie (desde el 16/11)
Herramientas en `produccion/tools` (copiar al scratchpad si hace falta; el proyecto Remotion está en `scratchpad/render`):
1. **Guion** → `guiones/ID.txt` (números en letra). Datos solo de fuentes oficiales o 2 fuentes (curl a la web; WebFetch no resuelve DNS aquí).
2. **Voz**: ElevenLabs `creative_generate_speech`, voz Dani `xH6DmlUWSqhSmFog5gxa`, `eleven_v4`, prompt `[excited] ` + texto, 1 toma. Descargar el mp3 a `render/public/voz-id.mp3`. Textos de más de ~4.500 caracteres, en 2 partes y unir con ffmpeg.
3. **Tiempos**: `python3 tools/alinear.py voz.mp3 guiones/ID.txt words/ID.json` (Whisper local + texto exacto; no gasta créditos).
4. **Ficha** (`fichas/*.py` → `fichas/ID.json`): planos con ancla de palabras (`a`), `img`/`clip`/`sello`/`ficha`/`cita`/`tpl`; `lista` reparte una sección entre varias imágenes. `python3 tools/hacer.py fichas/ID.json --still 1,5,9` para revisar.
5. **Render**: `tools/cola.sh ID ...` (≈4 min por Short, ≈60-90 min por largo).
6. **Entrega**: datos en `fichas/meta.json` y `python3 tools/entregar.py ID` → miniatura + vídeo + entrada del panel; publicar el panel con los `media/` nuevos (máx. ~60 MB por publicación).
**Shorts 🎮 (desde el 20/11)**: cada día buscar en prensa (IGN, Vandal, 3DJuegos, HobbyConsolas, MeriStation, Rockstar Newswire) lo que haya encontrado la comunidad, confirmar en 2 fuentes y montar con capturas oficiales; no usar gameplay de otros creadores sin permiso.
**Límite del panel:** una versión del artifact admite 256 MB en total. Cuando haga falta espacio, quitar con `remove` los `media/*.mp4` de vídeos ya publicados (fecha pasada) antes de subir nuevos; los que no quepan se mandan por el chat.

## YouTube Data API (desde el 18/11, en tiempo real)
La clave está guardada como network secret del entorno (host `www.googleapis.com`, cabecera `X-Goog-Api-Key`): basta con `curl` sin poner clave.
- Canal: `curl -s "https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=UCRRMgCBoG6ArTKL1RZkVJmg"` → suscriptores (`subscriberCount`), visitas totales y la lista de subidas (`relatedPlaylists.uploads`).
- Vídeos: `playlistItems?part=contentDetails&maxResults=50&playlistId=<uploads>` → ids; `videos?part=snippet,statistics&id=<ids>` → visitas, likes y comentarios de cada vídeo.
Usarla primero en "¿qué toca hoy?" (suscriptores reales de hoy para `sYT`); Windsor sigue siendo la fuente de horas de vídeos largos y de visitas por día. Retención, CTR y "pasar de largo" solo salen de capturas de YouTube Studio.

## Notion: base "Descubrimientos GTA VI" (desde el 18/11)
Página "GTA Oculto" (privada): https://app.notion.com/p/41cecd20cb1d810e884df7f0bb162ef9 · base: https://app.notion.com/p/41cecd20cb1d81caa527d28771c8c6b2 (data source `collection://41cecd20-cb1d-81a3-838b-000b70501d99`).
Cada hallazgo de la comunidad entra como "Visto"; pasa a "Verificado" solo con Fuente 1 y Fuente 2 independientes (marcar "2 fuentes"); luego Guion → Montado → Publicado (rellenar "Vídeo" y "Fecha publicación"). Los Shorts 🎮 (J01…) salen de aquí, por "Potencial".

## Rutina automática de las mañanas (desde el 19/11)
Tarea programada diaria a las 08:43 (Madrid), id `trig_01X8AGcNvaNaQtxbCxQDkko5`, en esta sesión: estadísticas → barrido de prensa → Notion → 2 Shorts 🎮 con `tools/jshort.py` (ficha automática por temas; antes: guion, voz ElevenLabs y `alinear.py`) → panel → resumen. Comentarios fijados de cada vídeo: página de Notion "Comentarios fijados" (https://app.notion.com/p/41cecd20cb1d81e88ce9e5cdc055464d).

## Estadísticas automáticas (Windsor.ai, desde el 17/11)
Al responder "qué toca hoy", **antes** de nada:
1. `mcp__Windsor_ai_for_Social_Media__get_data` con `connector: "youtube"`:
   - `fields: [channel_title, subscriber_count]` (sin fechas) → suscriptores actuales (`sYT`). Comprobar que el canal es **GTA OCULTO** (UCRRMgCBoG6ArTKL1RZkVJmg).
   - `fields: [date, creator_content_type, views, estimated_minutes_watched]`, `date_preset: "last_30d"` → por día: visitas totales (`vYT`), visitas de Shorts y minutos de vídeos largos (`videoOnDemand`).
2. Escribir con ArtifactData en `tracker/<fecha>` (url del panel) los días que falten: `vYT` (visitas del día), `sYT` (suscriptores, solo en el día de hoy), `hYT` (horas acumuladas de vídeos largos = suma de minutos `videoOnDemand` desde el 17/11 ÷ 60, con 1 decimal), `svYT` (visitas de Shorts de los últimos 90 días = suma acumulada desde el 17/11 mientras no haya 90 días). Leer antes cada documento y escribir con `if_version`.
3. Dar en la respuesta una línea de progreso: suscriptores / 1.000, horas / 4.000 y días hasta el 31/01.
Notas: YouTube publica los datos con 1-2 días de retraso. La prueba de Windsor solo deja leer 30 días hacia atrás: por eso las cifras se acumulan día a día en el tracker. Punto de partida (17/11): 75 suscriptores, 0 h de vídeos largos, 241 visitas de Shorts en 30 días (vídeos antiguos, ya privados).
