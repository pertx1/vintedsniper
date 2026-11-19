import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { PALETA, TIPO, Lienzo, useU, useGolpe, useAcerca } from "./gta-base";

/**
 * LA SINOPSIS: tarjeta oscura con un titulo de color y un parrafo.
 * ================================================================
 *
 * En la referencia sale cuando se lee algo oficial —la descripcion de un
 * juego, la biografia de un personaje, un comunicado— y es la hermana oscura
 * de la ficha blanca del marcador: alli el texto es de un periodico y aqui es
 * del propio fabricante.
 *
 * EL TEXTO APARECE POR LINEAS, no de golpe ni letra a letra. Letra a letra
 * obliga a esperar y en un estilo de dos segundos por plano no hay tiempo;
 * de golpe no guia la lectura. Por lineas acompaña a la voz.
 *
 * EL TITULO VA EN EL ROSA DE LA PALETA sobre el violeta oscuro: es el
 * contraste que trae el cartel de GTA VI y el que hace que esta tarjeta no
 * parezca una diapositiva corporativa.
 */

export interface GtaSinopsisProps {
  /** El titulo, arriba y en color. */
  text?: string;
  /** El cuerpo, en lineas. Cada una entra detras de la anterior. */
  items?: string[];
  /** Fotogramas entre linea y linea. */
  value?: number;
  /** El color del titulo. Por defecto, el rosa coral de la paleta. */
  accent?: string;
}

const GtaSinopsis: React.FC<GtaSinopsisProps> = ({
  text,
  items = [],
  value = 9,
  accent,
}) => {
  const frame = useCurrentFrame();
  const u = useU();
  const golpe = useGolpe();
  const acerca = useAcerca(4);
  const a = golpe(0);
  const color = accent || PALETA.rosa;
  const codigos = items.some((x) => x.includes(" · "));

  return (
    <AbsoluteFill>
      <Lienzo />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: codigos ? "92%" : "66%",
            padding: codigos ? `${3 * u}px ${3.4 * u}px` : `${4.5 * u}px ${5 * u}px`,
            borderRadius: `${1.8 * u}px`,
            // Casi negro con un punto de violeta, como la tarjeta de la
            // referencia: el negro puro sobre el lienzo hace un agujero.
            background: "rgba(14, 8, 34, 0.93)",
            border: `1px solid ${color}44`,
            boxShadow: `0 ${2.4 * u}px ${7 * u}px rgba(0,0,0,0.6), 0 0 ${4 * u}px ${color}22`,
            opacity: a,
            transform: `translateY(${(1 - a) * 2 * u}px) scale(${acerca})`,
          }}
        >
          {text ? (
            <div
              style={{
                color,
                fontFamily: TIPO.grito,
                fontWeight: 900,
                fontSize: `${4.6 * u}px`,
                lineHeight: 1.1,
                marginBottom: `${1.8 * u}px`,
              }}
            >
              {text}
            </div>
          ) : null}

          {items.map((linea, i) => {
            const b = Math.max(0, Math.min(1, (frame - (8 + i * value)) / 8));
            return (
              <div
                key={i}
                style={{
                  color: "rgba(255,255,255,0.93)",
                  fontFamily: TIPO.normal,
                  fontSize: `${2.5 * u}px`,
                  lineHeight: 1.5,
                  opacity: b,
                  transform: `translateX(${(1 - b) * 1.4 * u}px)`,
                }}
              >
                {codigos && linea.includes(" · ") ? (
                  <>
                    <div style={{ color: PALETA.rotulo, fontFamily: TIPO.grito, fontSize: `${2.2 * u}px`, lineHeight: 1.2, marginTop: `${0.8 * u}px` }}>{linea.split(" · ")[0]}</div>
                    <div style={{ color: "#fff", fontWeight: 800, fontSize: `${2.7 * u}px`, letterSpacing: `${0.15 * u}px`, lineHeight: 1.25 }}>{linea.split(" · ")[1]}</div>
                  </>
                ) : (
                  linea
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default GtaSinopsis;
