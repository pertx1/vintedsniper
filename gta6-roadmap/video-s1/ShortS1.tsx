import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Montaje, Plano } from "./Montaje";
import planos from "./s1-guion.json";
import words from "./s1-words.json";

const P = planos as (Plano & { ia?: boolean })[];
const W = words as [string, number, number][];
const FPS = 30;
const inicios = (() => { let t = 0; return P.map((p) => { const s = t; t += p.segundos || 3; return s; }); })();
const planoEn = (t: number) => { let i = inicios.length - 1; while (i > 0 && inicios[i] > t) i--; return i; };
const DUR = inicios[inicios.length - 1] + (P[P.length - 1].segundos || 3);

// Palabras clave: zoom de golpe al pronunciarlas.
const CLAVES = ["GTA", "VI.", "diecinueve", "PS5", "Xbox", "PC?", "nada", "Jason", "Lucía:", "huye", "Leonida,", "Florida,", "Vice", "loco:", "2013.", "Trece", "espera.", "precarga", "abierta.", "Sígueme:", "secretos"];
const golpes = W.filter(([w]) => CLAVES.includes(w)).map(([, s]) => s);
// Momentos con BOOM y sacudida.
const BOOMS = [0, 22.64, 26.76, 32.12];
const desde = (t: number, lista: number[]) => { let d = Infinity; for (const x of lista) if (t >= x) d = Math.min(d, t - x); return d; };

/* Cámara: punch-in en cada corte, zoom en palabras clave, deriva lenta y sacudida en los booms. */
const Camara: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useCurrentFrame() / FPS;
  const dc = desde(t, inicios), dk = desde(t, golpes), db = desde(t, BOOMS);
  const punch = dc < 0.3 ? interpolate(dc, [0, 0.3], [0.14, 0], { extrapolateRight: "clamp" }) : 0;
  const kick = dk < 0.25 ? interpolate(dk, [0, 0.06, 0.25], [0, 0.07, 0.03], { extrapolateRight: "clamp" }) : dk < 1.2 ? 0.03 : 0;
  const deriva = 0.02 * Math.sin(t * 0.7);
  const sac = db < 0.4 ? (1 - db / 0.4) * 22 : 0;
  const sx = sac * Math.sin(t * 90), sy = sac * Math.cos(t * 77);
  return (
    <AbsoluteFill style={{ transform: `translate(${sx}px, ${sy}px) scale(${1 + punch + kick + deriva})`, transformOrigin: "50% 45%" }}>
      {children}
    </AbsoluteFill>
  );
};

/* Flash blanco de 3 fotogramas en cada corte. */
const Flash: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  const d = desde(t, inicios.slice(1));
  const o = d < 0.1 ? interpolate(d, [0, 0.1], [0.55, 0]) : 0;
  return o > 0 ? <AbsoluteFill style={{ background: "#fff", opacity: o, mixBlendMode: "screen" }} /> : null;
};

/* Barra de progreso arriba: engancha a ver hasta el final. */
const Progreso: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "rgba(0,0,0,.35)" }}>
      <div style={{ height: "100%", width: `${Math.min(100, (t / DUR) * 100)}%`, background: "linear-gradient(90deg,#FFE02E,#FF8A3D,#EC517D,#C1309E)" }} />
    </div>
  );
};

/* Subtítulos: 3 palabras, la activa en amarillo con rebote. */
const Subtitulos: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / FPS;
  let idx = W.findIndex(([, s, e]) => t >= s && t < e + 0.12);
  if (idx === -1) { for (let i = W.length - 1; i >= 0; i--) if (W[i][1] <= t) { idx = i; break; } }
  if (idx === -1 || planoEn(t) === 0) return null;
  const g = Math.floor(idx / 3) * 3;
  const rebote = spring({ frame: frame - Math.round(W[idx][1] * FPS), fps: FPS, config: { damping: 9, stiffness: 220 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 44px", maxWidth: width - 160 }}>
        {W.slice(g, g + 3).map(([w], i) => {
          const act = g + i === idx;
          return (
            <span key={i} style={{
              display: "inline-block", fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 900, fontSize: 64, lineHeight: 1.1,
              textTransform: "uppercase", color: act ? "#FFE02E" : "#FFFFFF",
              WebkitTextStroke: "10px #0B0620", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(11,6,32,.5)",
              transform: act ? `scale(${0.85 + 0.3 * rebote}) rotate(${(1 - rebote) * -4}deg)` : "scale(1)",
            }}>{w.replace(/[.,:]$/, "")}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const EtiquetaIA: React.FC = () => {
  const t = useCurrentFrame() / FPS;
  if (!P[planoEn(t)].ia) return null;
  return <div style={{ position: "absolute", bottom: 250, left: 40, color: "rgba(255,255,255,.6)",
    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 20 }}>Imagen IA</div>;
};

/* Flami: entra de golpe en el gancho, reacciona en "lo más loco" y despide. */
const Flami: React.FC = () => {
  const frame = useCurrentFrame();
  const apariciones = [
    { desde: 0.0, hasta: 2.2, x: 690, y: 230, h: 560, rot: -8 },
    { desde: 22.6, hasta: 25.2, x: 700, y: 1220, h: 540, rot: 8 },
    { desde: 32.1, hasta: 36.7, x: 590, y: 1060, h: 780, rot: -4 },
  ];
  const t = frame / FPS;
  const a = apariciones.find((p) => t >= p.desde && t < p.hasta);
  if (!a) return null;
  const local = frame - Math.round(a.desde * FPS);
  const entra = spring({ frame: local, fps: FPS, config: { damping: 10, stiffness: 170 } });
  const sale = interpolate(Math.round(a.hasta * FPS) - frame, [0, 5], [0, 1], { extrapolateRight: "clamp" });
  return (
    <Img src={staticFile("flami.png")} style={{
      position: "absolute", left: a.x + (1 - entra) * 400, top: a.y + Math.sin(local / 5) * 8, height: a.h,
      transform: `rotate(${a.rot + (1 - entra) * 25 + Math.sin(local / 9) * 3}deg) scale(${0.5 + 0.5 * entra})`,
      opacity: Math.min(1, entra * 1.5, sale), filter: "drop-shadow(0 18px 24px rgba(11,6,32,.55))",
    }} />
  );
};

const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 60, right: 50, color: "rgba(255,255,255,.55)",
    fontFamily: "Montserrat, Inter, sans-serif", fontWeight: 800, fontSize: 30 }}>@gtaoculto_es</div>
);

export const ShortS1: React.FC = () => (
  <AbsoluteFill style={{ background: "#0B0620", overflow: "hidden" }}>
    <Camara><Montaje planos={P} /></Camara>
    <Flash />
    <Flami />
    <Subtitulos />
    <EtiquetaIA />
    <Marca />
    <Progreso />
    <Audio src={staticFile("voz.mp3")} />
    <Audio src={staticFile("musica.wav")} volume={0.13} />
    {inicios.slice(1).map((s, i) => (
      <Sequence key={"w" + i} from={Math.max(0, Math.round((s - 0.1) * FPS))} durationInFrames={20}>
        <Audio src={staticFile("whoosh.mp3")} volume={0.35} />
      </Sequence>
    ))}
    {BOOMS.map((s, i) => (
      <Sequence key={"b" + i} from={Math.max(0, Math.round((s - 0.05) * FPS))} durationInFrames={32}>
        <Audio src={staticFile("boom.mp3")} volume={0.55} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
