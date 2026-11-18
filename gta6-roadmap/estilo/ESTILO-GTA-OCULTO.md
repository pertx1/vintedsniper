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
