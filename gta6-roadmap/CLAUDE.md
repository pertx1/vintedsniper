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
