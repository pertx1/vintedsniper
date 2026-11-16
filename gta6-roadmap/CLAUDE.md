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
