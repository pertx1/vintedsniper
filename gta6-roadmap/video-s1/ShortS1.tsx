import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Montaje, Plano } from "./Montaje";
import planos from "./s1-guion.json";
import words from "./s1-words.json";

// Planos que llevan imagen generada con IA (la etiqueta es obligatoria en el canal).
const IA = (planos as Plano[]).map((p) => Boolean(p.imageUrl));
const inicios = (() => { let t = 0; return (planos as Plano[]).map((p) => { const s = t; t += p.segundos || 3; return s; }); })();

const Subtitulos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const W = words as [string, number, number][];
  // Grupos de 3 palabras; se ve el grupo de la palabra que suena.
  let idx = W.findIndex(([, s, e]) => t >= s && t < e + 0.12);
  if (idx === -1) { for (let i = W.length - 1; i >= 0; i--) if (W[i][1] <= t) { idx = i; break; } }
  if (idx === -1) return null;
  // En la portada (plano 2) el título ya está en pantalla: sin subtítulos.
  if (t >= inicios[1] && t < inicios[2]) return null;
  const g = Math.floor(idx / 3) * 3;
  const grupo = W.slice(g, g + 3);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 400 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 44px", maxWidth: width - 120 }}>
        {grupo.map(([w], i) => {
          const activa = g + i === idx;
          return (
            <span key={i} style={{
              fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900, fontSize: 92, lineHeight: 1.05,
              textTransform: "uppercase", color: activa ? "#FFE02E" : "#FFFFFF",
              WebkitTextStroke: "14px #0B0620", paintOrder: "stroke fill",
              transform: activa ? "scale(1.08)" : "none", textShadow: "0 8px 0 rgba(11,6,32,.55)",
            }}>{w.replace(/[.,:]$/, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const EtiquetaIA: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  let i = inicios.length - 1; while (i > 0 && inicios[i] > t) i--;
  if (!IA[i]) return null;
  return (
    <div style={{ position: "absolute", bottom: 300, left: 50, padding: "8px 18px", borderRadius: 12,
      background: "rgba(11,6,32,.72)", color: "#fff", fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: 30 }}>
      Imagen IA · no es del juego
    </div>
  );
};

const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 70, right: 50, color: "rgba(255,255,255,.55)",
    fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 800, fontSize: 32 }}>@gtaoculto_es</div>
);

export const ShortS1: React.FC = () => (
  <AbsoluteFill style={{ background: "#0B0620" }}>
    <Montaje planos={planos as Plano[]} />
    <Subtitulos />
    <EtiquetaIA />
    <Marca />
    <Audio src={staticFile("voz.mp3")} />
  </AbsoluteFill>
);
