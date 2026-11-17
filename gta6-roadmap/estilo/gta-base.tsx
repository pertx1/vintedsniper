import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * ESTILO GTA: un mundo aparte.
 * ============================
 *
 * ESTO NO COMPARTE NADA CON EL ESTILO DE LA CASA, y es a proposito. Un estilo
 * que solo cambia los colores del otro se ve como el mismo video pintado de
 * otro color. Aqui cambia la gramatica entera:
 *
 *   el estilo de la casa          el estilo GTA
 *   ─────────────────────         ─────────────────────────
 *   una pieza cada 45-60 s        una imagen cada 1,6-1,9 s
 *   tarjeta que corta el plano    el plano ES la tarjeta
 *   cabecera + frase + filas      material ajeno flotando
 *   subtitulos discretos          subtitulos amarillos, palabra a palabra
 *   el que habla, siempre         el que habla, casi nunca
 *
 * Medido sobre los dos videos de referencia: 415 cortes en 10,8 min y 352 en
 * 10,9 min. Un video de diez minutos son CUATROCIENTOS planos. Por eso aqui
 * no hay "plantillas que salen de vez en cuando": hay un lienzo y piezas que
 * se suceden sin parar.
 *
 * LA PALETA es la del cartel de Grand Theft Auto VI, leida de la imagen que
 * paso el, no aproximada a ojo. Es una ESCALERA, de violeta casi negro a
 * amarillo calido, y las piezas la recorren en vez de usar dos colores
 * sueltos.
 */

export const PALETA = {
  noche: "#170E46",   // violeta casi negro
  violeta: "#37146D", // violeta profundo
  purpura: "#6F1E89",
  magenta: "#C1309E",
  rosa: "#EC517D",    // rosa coral
  coral: "#F56463",
  naranja: "#F8894A",
  amarillo: "#F5A94D", // amarillo calido
  /** El amarillo de los subtitulos: mas encendido que el de la paleta,
   *  porque tiene que leerse sobre cualquier fotograma. */
  rotulo: "#FFE02E",
  blanco: "#FFFFFF",
  tinta: "#0B0620",
};

export const TIPO = {
  /** Los subtitulos y los numeros: pesada, condensada, en mayusculas. */
  grito: "GTAPD, Montserrat, Inter, 'Liberation Sans', sans-serif",
  /** El texto corriente de las fichas. */
  normal: "Inter, Montserrat, 'Liberation Sans', sans-serif",
};

export const useU = () => useVideoConfig().height / 100;

/**
 * EL LIENZO.
 *
 * En los videos de referencia es un azul plano; aqui es el atardecer de la
 * paleta, que es lo que lo hace nuestro y no suyo. Se mueve despacio: en un
 * estilo donde la imagen cambia cada dos segundos, un fondo parado canta
 * todavia mas.
 */
export const Lienzo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const x = 50 + Math.sin(t * 0.33) * 7;
  const y = 58 + Math.cos(t * 0.24) * 5;
  return (
    <>
      <AbsoluteFill
        style={{
          background: `linear-gradient(168deg, ${PALETA.violeta} 0%, ${PALETA.noche} 58%, ${PALETA.tinta} 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(72% 62% at ${x}% ${y}%, ${PALETA.magenta}CC 0%, ${PALETA.purpura}77 38%, rgba(23,14,70,0) 74%)`,
          mixBlendMode: "screen",
        }}
      />
      {/* Una franja calida abajo: el sol de Vice City asomando. Sin ella el
          lienzo se queda en violeta y pierde la mitad de la escalera. */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(0deg, ${PALETA.amarillo}66 0%, ${PALETA.naranja}55 9%, ${PALETA.rosa}33 20%, rgba(23,14,70,0) 40%)`,
          mixBlendMode: "screen",
        }}
      />
    </>
  );
};

/**
 * LA ENTRADA DE ESTE ESTILO: seca.
 *
 * Seis fotogramas, no doce. Con un plano cada dos segundos, una entrada
 * suave de medio segundo se come un cuarto del plano y el video entero se
 * siente lento.
 */
export const useGolpe = () => {
  const frame = useCurrentFrame();
  return (desde = 0) =>
    interpolate(frame - desde, [0, 6], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
};

/**
 * EL ACERCAMIENTO LENTO que llevan todas las piezas de los videos de
 * referencia: la tarjeta entra y sigue creciendo un 6% mientras se lee. Es lo
 * que impide que dos segundos de captura se lean como una foto pegada.
 */
export const useAcerca = (porCiento = 6) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return 1 + (frame / Math.max(1, durationInFrames)) * (porCiento / 100);
};
