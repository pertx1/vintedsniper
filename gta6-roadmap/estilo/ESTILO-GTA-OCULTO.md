# Estilo GTA Oculto (Shorts)

El estilo aprobado es el del **S1 v5**. Todos los Shorts se hacen así. Para un vídeo nuevo solo cambia un archivo de datos (`ejemplo-S1.json` como modelo) y los clips/imágenes de `public/`.

## Ficha técnica
| | |
|---|---|
| Formato | Vertical 1080×1920, 30 fps, 30-45 s |
| Ritmo | **Un plano nuevo cada 1,3-2 s** (el S1 tiene 21 planos en 36,7 s) |
| Mezcla de planos | ~60 % **vídeo real del tráiler** (≤ 3 s, sin su audio) · ~30 % plantillas (cifras, barras, fichas, sellos) · fichas de personaje con imagen fija |
| Gancho (0-2 s) | Vídeo real potente + texto arriba (`topText`) + Flami entrando de golpe + BOOM + sacudida. Nunca violencia en los 7 primeros segundos |
| Cámara | Punch-in en cada corte, mini zoom en cada palabra clave, flash corto en los cortes (no en el fotograma 0), deriva lenta |
| Subtítulos | Montserrat 900, 64 px, grupos de 3 palabras, la activa en amarillo `#FFE02E` con rebote. Se ocultan en las fichas de personaje |
| Barra de progreso | Arriba, 12 px, degradado amarillo → naranja → rosa → magenta |
| Marca | `@gtaoculto_es` arriba a la derecha (55 % opacidad) · "Imágenes: Rockstar Games" abajo a la izquierda |
| Flami | 3 apariciones: gancho (esquina, pequeño), momento "lo más loco" (junto a una plantilla), cierre/CTA (grande) |

## Sonido
| Pista | Volumen | Notas |
|---|---|---|
| Voz | 1,0 | ElevenLabs, voz **"Dani – Energetic Spanish YouTuber"** (`xH6DmlUWSqhSmFog5gxa`), modelo eleven_v4, empezando con `[excited]` |
| Música | 0,13 | `musica-synthwave.wav` (hecha con código, sin derechos) |
| Whoosh | 0,20 | En cada corte |
| Boom | 0,55 | Gancho (0 s) + 2-3 momentos clave + "Sígueme" |
Medición del S1: voz sola −24,4 dB de media; mezcla −22,6 dB; pico −1,9 dB (sin saturar).

## Proceso de un Short (≈ 30-40 min)
1. **Guion** (30-40 s) con el prompt maestro. Comprobar cada dato. Escribir los números en letra para la voz.
2. **Voz** en ElevenLabs con la voz de arriba → **transcribir** con Scribe para tener los tiempos palabra a palabra.
3. **Planos**: repartir la voz en planos de 1,3-2 s siguiendo los tiempos de las palabras. Alternar vídeo real ↔ plantilla.
4. **Clips**: cortar del tráiler oficial con `cortar_clip.py` a la duración exacta de cada plano (+0,1 s), eligiendo `CENTRO_X` para que el sujeto quede dentro del vertical.
5. **Datos**: rellenar el JSON (planos, palabras, claves, booms, Flami, voz) y renderizar la composición `ShortGTAOculto`.
6. **Revisar** 8-10 fotogramas: nada cortado, textos dentro de la zona segura, subtítulos sin pisar nombres.

## Plantillas que mejor funcionan (del pack del Drive)
- `gta-plano` con `videoUrl` → el plano de vídeo real (con `topText` para el titular).
- `gta-dato` → cifras grandes; `fijo: true` para fechas (no cuenta hacia arriba).
- `gta-personaje` → fichas de personaje (imagen recortada en vertical centrada en la cara).
- `gta-sello` con `videoUrl` → "PC: SIN ANUNCIAR", "CONFIRMADO", "RUMOR"…
- `gta-barras`, `gta-sinopsis`, `gta-marcador` → datos y CTA.
- Títulos de `gta-sinopsis`/`gta-marcador`: **máximo ~14 caracteres por palabra** o se salen en vertical.

## Fuentes de material
- **Vídeo**: descargas oficiales de rockstargames.com/VI (tráiler de lanzamiento y "Pre-Load Now", 4K). 38 clips ya cortados en la biblioteca.
- **Fotos**: 233 capturas oficiales clasificadas en 9 carpetas (`biblioteca-gta6`).
- No se suben al repositorio: son de Rockstar.

## Miniaturas
- **Vídeos largos (1280×720), estilo "clic" (desde el 17/11):** sin Flami. Herramienta `produccion/tools/mini2.py` + recetas en `produccion/tools/miniaturas_largos.py`.
  - Personaje **recortado del arte oficial** (rembg) enorme, ocupando 40-55 % del ancho, con borde blanco y brillo de color (rosa `#FF28A0` o cian).
  - **2-4 palabras gigantes** en Pricedown (150-220 px), blanco + amarillo `#FFE02E` (o rojo para la palabra de alarma), contorno negro grueso y sombra.
  - Una pregunta o un reto: "¿MUERE LUCÍA?", "¿20$ TIRADOS?", "NO JUEGUES SIN VER ESTO", "2002 VS 2026". Siempre algo que el vídeo responde de verdad.
  - Etiqueta pequeña en caja de color (GTA 6, ULTIMATE, 25 TEORÍAS) y, si ayuda, flecha roja hacia el objeto clave.
  - Fondo oficial desenfocado y oscurecido por el lado del texto; viñeta.
- **Shorts (1080×1920):** se mantiene Flami, como en S1 y S2.

## Movimiento en los Shorts (desde el 17/11)
- **Más vídeo que foto:** al menos 2 de cada 3 planos tienen que ser clips. Las imágenes fijas, solo para fichas, citas, sellos o cuando no hay clip del tema.
- Fuentes de clips: `render/public/h/` (tráilers y precarga), `render/public/ext/` (trozos de 2,6 s del Extended Look oficial, catálogo en `produccion/clips-extended.md`), loops oficiales de personajes y clips animados hechos con `zoompan` a partir de imágenes oficiales (`render/public/ds/mov*.mp4`).
- En la ficha: `{'clip':'ext/ext-0452'}` usa cualquier ruta de `public/` (sin `.mp4`).
- Clips de ≤ 3 s y sin audio (regla de `07-riesgos-y-reglas.md`).

## Tipografía (desde el 17/11)
- **Pricedown** (`marca/Pricedown.otf`, licencia Typodermic: uso comercial en logos e imágenes permitido) para títulos, cifras, sellos, fichas, subtítulos, marca de agua y miniaturas. En Remotion se carga como `GTAPD` desde `public/Pricedown.otf` con `font-synthesis: none`.
- Inter solo para textos pequeños de lectura (descripciones de fichas, listas, créditos).
- Pricedown no tiene la flecha →: usar guion.

## Higgsfield para miniaturas (desde el 18/11)
Usar siempre el modelo más barato: `gpt_image_2_6` con `quality: "low"` y `resolution: "1k"` (0,25 créditos por imagen; antes 2,75 con high/2k). Solo subir calidad si Oier lo pide para una miniatura concreta. El texto se pone después con `tools/mini2.py` (Pricedown), no con la IA.

## Gancho de los Shorts (desde el 18/11, tras el 62,5 % de "pasar de largo" del S12)
1. Primera frase dirigida al espectador o con el dato más sorprendente en los 2 primeros segundos ("Si juegas en PC, hoy no vas a poder…", "Esta mujer salió de la cárcel…"). Nada de "Cuatro cosas que…" como arranque.
2. Primer plano: una cara o movimiento, no una vista general de la ciudad.
3. El texto de arriba del primer plano dice el dato, no el tema.

## Duración de los Shorts (desde el 18/11)
Objetivo 25-30 s (el S23 de 43 s retuvo de media 19 s). Gancho + 2-3 datos fuertes + pregunta final; fuera explicaciones de relleno. Para recortar un Short ya grabado sin regenerar voz: `python3 tools/recortar.py ID` (lista frases) y `python3 tools/recortar.py ID 3,5` (quita esas frases del audio, palabras, guion y ficha).

## Serie «¿MITO o VERDAD?» (desde el 22/11)
Gancho = la pregunta del mito («¿Hay un fantasma en Mount Kalaga?»), sello final MITO / VERDAD / SIN CONFIRMAR (2 fuentes para VERDAD o MITO). Título con la pregunta + emoji + «MITO o VERDAD». Comentario fijado: «¿Qué mito quieres que compruebe ahora?».

## Motion graphics (desde el 18/11): plantilla `gta-grafico`
Para explicar mecánicas, como en las referencias de TikTok: `{"a":"…","tpl":"gta-grafico","tipo":"rastreador|velocimetro|precio|app","text":"PÍLDORA","topText":"línea pequeña","value":N,"unit":"…","items":[…],"imageUrl":"p/…"}`.
- rastreador: mapa en cuadrícula + ruta que se dibuja + punto que late (GPS, policía, rutas).
- velocimetro: aguja hasta `value` sobre `unit` (máximo).
- precio: barra que se llena y "+$X" contando.
- app: móvil que escanea y va mostrando `items` (WAiNK, menús).
1-2 por Short, sobre la frase que explica la mecánica. `tools/jshort.py` los pone solo por palabras clave (luego revisar `items`/`value` a mano con el dato real).

## Títulos de vídeos largos (desde el 18/11)
«GTA 6» + palabra que se busca primero («Trucos de GTA 6…», «Mapa de GTA 6…», «GTA 6 vs GTA 5…»), luego la promesa concreta. 50-70 caracteres. Los títulos de curiosidad («NO juegues…») solo para Shorts.

## Más comentarios y más suscripciones (desde el 18/11)
- **Shorts:** la última frase pide UNA respuesta fácil: elegir entre dos («Escribe JASON o LUCÍA», «¿Deportivo o chatarra?») o un número/una palabra. Nada de «déjame tu opinión».
- **Suscripción con motivo, no «suscríbete» a secas:** «Sígueme: el día que lo confirmen, lo tienes aquí» / «mañana subo la parte 2».
- **Largos:** a los 25-35 % del vídeo, una llamada con motivo («si esto te sirve, suscríbete: el 24 subo todos los trucos»); a mitad, una pregunta para comentar con número («dime en comentarios qué pregunta era la tuya»); al final, pantalla final con el siguiente vídeo + suscribirse.
- **Oier:** comentario fijado con pregunta, ❤️ a todos y responder en la primera hora SIEMPRE con otra pregunta. Una encuesta al día en la pestaña Comunidad (2 opciones, del tema del día).
- **Series** («¿MITO o VERDAD?», «Secretos parte 1/2…»): crean el motivo para suscribirse.

## Duración de los largos (desde el 23/11)
- Mínimo **9 minutos** (≈1.700 palabras). Excepción: L11 trucos. Se alarga con más datos con fuente (secciones extra, errores típicos, dónde encontrar cosas), nunca con relleno.

## Vídeos largos dinámicos (desde el 19/11)
`python3 tools/dinamizar.py GENID graf/GENID.json` sobre el gen ya montado: parte cada imagen en clip oficial (≤2,4 s) + imagen, mete 2-7 motion graphics en las frases con datos (precio, línea de tiempo, app, rastreador, velocímetro) y efectos de sonido propios (sfx/: stamp en sellos, ping en gráficos, cash con dinero, siren con policía, scratch con «ojo», shutter con fotos; mínimo 6 s entre efectos). Render con `tools/render_ins.sh GENID`.
Inspiración de miniatura (Willyrex, «¿Qué pasa si tienes 6 estrellas en GTA VI?», 498 K en 11 h): escena de acción enorme + cara de reacción en recuadro + fila de 6 estrellas; título «¿QUÉ PASA SI…?».

## Miniaturas: referencias que funcionan (19/11, carpeta `estilo/referencias-miniaturas/`)
Canales grandes de GTA 6 (100K–3,4M vistas en días). Patrones comunes:
1. **1–3 palabras ENORMES**, mayúsculas, amarillo/blanco con borde negro grueso, ocupando 1/3 de la imagen (lado izquierdo o franja superior). Ej.: «LEGENDARY WEAPONS EARLY!», «MAKE MONEY FAST», «OVERHYPED.».
2. **Un personaje oficial recortado** (Jason o Lucía), cara grande y expresiva, mirando a cámara o al elemento clave. Nunca escenas generadas recargadas.
3. **Un elemento de prueba**: tarjetas de inventario con precio (armas), cifra verde «$78000 / +$50000», móvil con la app VI, mapa, coches comparados.
4. **Logo GTA VI** en una esquina (y logo GTA V si es comparación).
5. **Fondos limpios**: cielo/playa de Leonida, degradado synthwave rosa-morado con texto estilo Vice («EVERYTHING»), o la Tierra de noche.
6. **Comparaciones**: pantalla partida mitad GTA 6 / mitad GTA 5 + «VS» rojo grande + etiqueta «SIN SPOILERS».
7. **Serie**: misma plantilla y cambia solo el número/personaje («100+ FEATURES» → «150+ FEATURES PARTE 2»).
8. **Dramático**: una frase manuscrita blanca subrayada en rojo sobre plano oscuro con luces de policía («THEY REMEMBER»).

Títulos de esas referencias que adaptamos: «Todo lo que tienes que saber antes de jugar», «150+ cosas confirmadas», «GTA 6 hace cosas que GTA 5 nunca pudo», «¿Se puede despistar a la policía en GTA 6?», «GTA 6 vs GTA 5 (sin spoilers)», «El mapa de GTA 6 es imposible», «Armas legendarias pronto», «Dinero rápido» (del juego), «¿GTA 6 está sobrevalorado?».

## Retención ≥ 50 % (desde el 20/11) — reglas obligatorias para Shorts
Motivo: los primeros Shorts (25–45 s) se quedaban en ~25 % visto entero.
1. **Duración 15–20 s** (45–55 palabras). Nunca más de 25 s.
2. **Primera frase = la afirmación más fuerte**, sin preámbulo («Bigfoot existe en GTA seis», «GTA seis no sale en PC»). Nada de «¿Mito o verdad?» ni «Hoy te cuento».
3. **Frases de 2–5 palabras** en la parte central («Nada. No explota. No rompe el edificio.»): cortes cada 1–2 s.
4. **Voz a ×1,1** (`atempo=1.1`) y sin silencio inicial (`silenceremove`).
5. **Sin cierre «SÍGUEME»** ni tarjeta final: la gente desliza en cuanto ve el CTA. Se termina con una pregunta de 3–5 palabras y el vídeo vuelve al principio (bucle). `fin` 0,25 s.
6. La llamada a comentar va en el **comentario fijado** y en la descripción, no hablada al final.
7. `tools/jshort.py`: el marcador final solo sale con `CIERRE=1`; los motion graphics solo con `MG=1`.

## Más comentarios y suscriptores (desde el 20/11)
Dato: Metacritic (19/11) 61,8 % se queda, 40 likes, 3 comentarios… y 0 suscriptores.
1. **Sello final con la pregunta** (`tools/sello_final.py ID "TEXTO"`): la pregunta se ve en grande el último segundo, además de oírse. Preguntas binarias: «SÍ o NO», «¿FALLO o A PROPÓSITO?».
2. **Responder a todos los comentarios en la primera hora**, siempre con otra pregunta (cada respuesta cuenta como interacción y reactiva el vídeo).
3. **Comentario fijado = la misma pregunta + enlace al largo** («🎥 Las 30 preguntas de GTA 6 en mi canal»).
4. **Títulos con afirmación + curiosidad** («Bigfoot existe en GTA 6 🦶 y ya lo han encontrado»), no con «MITO o VERDAD» delante.
5. **Serie diaria para suscribirse**: los descubrimientos van numerados en la descripción y en el comentario fijado («Secreto nº 3 de GTA 6 · cada día uno nuevo»), para que seguir el canal tenga sentido.
6. Temas: primero descubrimientos nuevos de la comunidad (Notion, potencial 🔥), luego datos generales.

## Gancho del fotograma 0 (desde el 21/11)
Dato de Studio con los Shorts viejos (25-31 s): Bigfoot 66 % pasa de largo, aviones 47 %, PC 36 %.
- Primer plano = **sello gigante con el dato** sobre un clip en movimiento: `tools/sello_inicio.py ID "TEXTO" clip` (máx. ~16 caracteres para que no se salga: «32 MILLONES», «PERRO AL RESCATE», «61 TRUCOS»).
- Primera frase hablada de 4-6 palabras con el dato («Un perro te rescata en GTA seis»).
- Objetivo: < 30 % pasa de largo y mínimo 3.000 visitas por Short.

## Gameplay real como b-roll (desde el 21/11)
Gameplay del amigo de Oier (Drive, sin audio, 720p): índice de escenas en `scratchpad/drive_gp/cs_*.jpg`, clips cortados en `render/public/gp/` (mar1, mar2, barco, perro, avion1, avion2, coche1, coche2, armas, menu, playa, playa2, tienda). En las fichas: `{"clip": "gp/NOMBRE", "cx": 0.5}`; `hacer.py` lo recorta a vertical a pantalla completa.
Regla: el primer plano de cada Short, gameplay real en movimiento (no imágenes del tráiler).

## Fórmula ganadora (22/11)
- **Shorts:** como el del perro (4.467 visitas): algo raro o absurdo que no sabías que existía, gameplay en movimiento desde el fotograma 0, sin sello grande al inicio, 14-17 s, una sola idea.
- **Largos:** como Ultimate vs Estándar (5.665 visitas, 250 h en 2 días, 73 % desde búsqueda, CTR búsqueda 21,7 %): responder una pregunta que la gente busca ahora. Uno al día durante el pico del lanzamiento, solo con temas de búsqueda real. Temas de historia/curiosidad → Shorts.
- `tools/entregar.py` crea o pisa la entrada del panel por ID: usar IDs nuevos (comprobar que no existen) para no machacar huecos de otros días.

## Títulos y ganchos de Shorts que despegan (23/11)
De 23 Shorts, casi todos se quedan en 1.100-1.500 visitas. Solo 2 han despegado, y los dos con la misma forma:
- «Si te pierdes en el mar en GTA 6, te rescata un perro» (4.897): **«Si haces X en GTA 6, pasa Y»**, algo que el jugador puede probar.
- «El coche de Paul Walker está escondido en GTA 6» (3.068): **«[algo famoso] está escondido en GTA 6»**.
La primera frase de la voz es el título, dicho tal cual. La lore pura («qué pasó con Wade») y las cifras se quedan en la media.

## Plan desde el 25/11 (Oier: «haz eso a partir de mañana»)
**Shorts como el de la casa (24/11: 7.949 visitas en 11 h, 82 likes, +22 subs).**
- Primera frase = el misterio inquietante dicho tal cual, sin contexto antes: «En GTA 6 hay una casa donde alguien sabe que vive en un videojuego», «…una vecina que podría ser una asesina en serie».
- 15-16 s, gameplay en movimiento desde el fotograma 0, 3-4 datos concretos (2 fuentes) y cierre con pregunta de sí o no: «¿Te da miedo?», «¿Es una asesina?».
- Temas: secretos turbios, teorías, cosas que «no deberían estar ahí», guiños escondidos. Mínimo 2 de los 3 Shorts diarios de este tipo; el tercero puede ser «Si haces X, pasa Y».

**Largos de búsqueda con poca competencia.**
- Antes de elegir tema, mirar con la API de YouTube (search + videos) los 10 primeros resultados en español: si hay vídeos con más de 100.000 visitas sobre lo mismo, se descarta. Buscar huecos (el 24/11: «extras de la Ultimate: dónde están» tenía 0 vídeos; «códigos de cajas fuertes», el mejor 6.800).
- Títulos «GTA 6 + búsqueda exacta + qué resuelve».

**Cada largo con su Short del mismo tema el mismo día** (o el anterior), y en ese Short «Vídeo relacionado» = el largo. En el resumen diario, decirle a Oier qué Short enlaza a qué largo.
- **Demanda:** además de la competencia, comprobar que la gente lo busca con el autocompletado de YouTube (`suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=es&gl=es&q=...`). Si no sale ninguna sugerencia (p. ej. «gta 6 peristas» el 24/11), el tema se descarta. No hay número exacto de búsquedas: es una señal de sí o no.

## Lecciones del 24-25/11
- Casa (misterio que casi nadie había contado en español): 17.101 visitas. Mandy (misterio ya contado por canales grandes, uno con 11 M): 1.232. Policía (consejo práctico y tema muy visto): 421. **Kreo no es la causa**: los cuatro se subieron con Kreo.
- Por tanto: los 3 Shorts del día son misterios inquietantes y POCO CONTADOS (comprobar con la API que en español el mejor tiene menos de ~20.000 visitas). Nada de consejos prácticos («cámbiate de ropa», «glitch de FPS»), salvo que lo que pase sea absurdo de verdad (el perro).
- Las segundas partes de un Short que despegó aprovechan a su público (casa → casa parte 2).
- Revisar fotogramas: los clips gp/noche3 y gpx/a27 llevan texto del juego en inglés («Go to the drive-thru window»); no usarlos. Con CACHE_DESDE se reutilizan clips cortados antiguos: si cambias un clip, renderiza sin caché.
