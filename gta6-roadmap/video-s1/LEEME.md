# S1 · cómo se ha montado y cómo volver a renderizarlo

- **Voz:** ElevenLabs, voz "Dani – Energetic Spanish YouTuber" (español de España), modelo eleven_v4. 36 s.
- **Subtítulos:** salen de la transcripción palabra a palabra (ElevenLabs Scribe) → `s1-words.json`.
- **Imágenes:** Higgsfield Z Image en vertical (0,15 créditos cada una). Todas llevan la etiqueta "Imagen IA · no es del juego".
- **Plantillas:** las del pack del Drive (`plantillas-gta.zip`), planos en `s1-guion.json`.
- **Composición:** `ShortS1.tsx` (montaje + subtítulos amarillos palabra a palabra + etiqueta IA + @ + voz).

## Volver a renderizarlo en tu ordenador
1. Descomprime `plantillas-gta.zip` y ejecuta `npm install`.
2. Copia `ShortS1.tsx`, `s1-guion.json` y `s1-words.json` a `src/`. Pon en `public/` la voz como `voz.mp3` y las imágenes `img0.jpg`…`img5.jpg`.
3. En `src/Root.tsx`, importa `ShortS1` y añade:
   `<Composition id="S1" component={ShortS1} fps={FPS} width={1080} height={1920} durationInFrames={Math.round(36.7 * FPS)} />`
4. Renderiza:
```bash
npx remotion render src/index.ts S1 salida/S1.mp4
```

Para cambiar cómo se ve, edita `s1-guion.json` (qué plantilla va en cada plano, sus textos y su duración) y vuelve a renderizar.

## v3 (más enganche)
- Gancho: portada de atardecer con "GTA VI" + Flami entrando de golpe + boom + sacudida desde el fotograma 0.
- Cámara: zoom de golpe en cada corte y en cada palabra clave, flash corto en los cortes, deriva lenta.
- Barra de progreso arriba. Subtítulos con rebote.
- Sonido: música synthwave hecha con código (`musica-synthwave.wav`, propia, sin derechos), whoosh en cada corte y boom en los momentos clave (efectos de ElevenLabs).
- En `gta-dato.tsx` se añadió la propiedad `fijo: true` para que una cifra no cuente hacia arriba (fechas).

## v4 (imágenes oficiales)
- Sin imágenes de IA: todas las fotos son oficiales de rockstargames.com/VI (biblioteca `biblioteca-gta6`, no se sube al repositorio porque es material de Rockstar).
- Gancho con el arte oficial de Jason y Lucía, fichas de personaje (`gta-personaje`) con recortes verticales centrados en la cara, Cayos reales para Leonida y el letrero de Vice City.
- Crédito "Imágenes: Rockstar Games" en pequeño abajo a la izquierda.
- Archivos de imagen que espera `public/`: jason-lucia-11.jpg, jason-v.jpg, lucia-v.jpg, pareja-v.jpg, cayos-mar-playa-06.jpg, vice-city-01.jpg, vice-city-02.jpg, vice-city-06.jpg, flami.png, voz.mp3, musica.wav, whoosh.mp3, boom.mp3.
