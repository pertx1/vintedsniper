import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Montaje, Plano } from "./Montaje";
import planos from "./s1-guion.json";
import words from "./s1-words.json";

const P = planos as (Plano & { ia?: boolean })[];
const inicios = (() => { let t = 0; return P.map((p) => { const s = t; t += p.segundos || 3; return s; }); })();
const planoEn = (t: number) => { let i = inicios.length - 1; while (i > 0 && inicios[i] > t) i--; return i; };

/* Subtítulos: más pequeños, grupos de 3 palabras, la que suena en amarillo. */
const Subtitulos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const t = frame / fps;
  const W = words as [string, number, number][];
  let idx = W.findIndex(([, s, e]) => t >= s && t < e + 0.12);
  if (idx === -1) { for (let i = W.length - 1; i >= 0; i--) if (W[i][1] <= t) { idx = i; break; } }
  if (idx === -1 || planoEn(t) === 1) return null;
  const g = Math.floor(idx / 3) * 3;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 28px", maxWidth: width - 160 }}>
        {W.slice(g, g + 3).map(([w], i) => (
          <span key={i} style={{
            fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900, fontSize: 64, lineHeight: 1.1,
            textTransform: "uppercase", color: g + i === idx ? "#FFE02E" : "#FFFFFF",
            WebkitTextStroke: "10px #0B0620", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(11,6,32,.5)",
          }}>{w.replace(/[.,:]$/, "")}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* Etiqueta IA: pequeña, abajo, solo en planos con imagen realista generada. */
const EtiquetaIA: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  if (!P[planoEn(t)].ia) return null;
  return <div style={{ position: "absolute", bottom: 250, left: 40, color: "rgba(255,255,255,.6)",
    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 20 }}>Imagen IA</div>;
};

/* Flami, el personaje del canal: entra en el gancho, reacciona en "lo más loco" y despide. */
const Flami: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const apariciones = [
    { desde: 0.15, hasta: 2.2, x: 640, y: 1130, h: 640, rot: -6 },   // gancho
    { desde: 22.3, hasta: 25.2, x: 700, y: 1250, h: 520, rot: 8 },   // "lo más loco"
    { desde: 32.2, hasta: 36.7, x: 600, y: 1080, h: 760, rot: -4 },  // cierre / CTA
  ];
  const t = frame / fps;
  const a = apariciones.find((p) => t >= p.desde && t < p.hasta);
  if (!a) return null;
  const local = frame - Math.round(a.desde * fps);
  const restante = Math.round(a.hasta * fps) - frame;
  const entra = spring({ frame: local, fps, config: { damping: 11, stiffness: 140 } });
  const sale = interpolate(restante, [0, 6], [0, 1], { extrapolateRight: "clamp" });
  const bote = Math.sin(local / 5) * 8;
  return (
    <Img src={staticFile("flami.png")} style={{
      position: "absolute", left: a.x, top: a.y + (1 - entra) * 500 + bote, height: a.h,
      transform: `rotate(${a.rot + Math.sin(local / 9) * 3}deg) scale(${0.6 + 0.4 * entra})`,
      opacity: Math.min(entra, sale), filter: "drop-shadow(0 18px 24px rgba(11,6,32,.55))",
    }} />
  );
};

const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 70, right: 50, color: "rgba(255,255,255,.55)",
    fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 800, fontSize: 30 }}>@gtaoculto_es</div>
);

export const ShortS1: React.FC = () => (
  <AbsoluteFill style={{ background: "#0B0620" }}>
    <Montaje planos={P} />
    <Flami />
    <Subtitulos />
    <EtiquetaIA />
    <Marca />
    <Audio src={staticFile("voz.mp3")} />
  </AbsoluteFill>
);
