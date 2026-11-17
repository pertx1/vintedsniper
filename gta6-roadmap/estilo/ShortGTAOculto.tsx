import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Montaje, Plano } from "./Montaje";

/** Datos de UN vídeo: es lo único que cambia entre Shorts. */
export type DatosShort = {
  planos: (Plano & { ia?: boolean })[];      // plantilla + segundos + textos/imagen/vídeo
  palabras: [string, number, number][];      // transcripción palabra a palabra (ElevenLabs Scribe)
  claves: string[];                          // palabras que llevan zoom de golpe
  booms: number[];                           // segundos con boom + sacudida (siempre 0 = gancho)
  flami: { desde: number; hasta: number; x: number; y: number; h: number; rot: number }[];
  voz: string;                               // archivo en public/
};
let P: DatosShort["planos"] = []; let W: DatosShort["palabras"] = [];
const FPS = 30;
let inicios: number[] = []; let DUR = 0;
const planoEn = (t: number) => { let i = inicios.length - 1; while (i > 0 && inicios[i] > t) i--; return i; };

let GRUPO: number[] = [];
const agrupa = (w: DatosShort["palabras"]) => { const g: number[] = []; let ini = 0; w.forEach(([, ], i) => { if (i > 0 && (i - ini >= 3 || /[.?!…:,]$/.test(w[i - 1][0]))) ini = i; g.push(ini); }); return g; };
let golpes: number[] = []; let BOOMS: number[] = [0]; let FLAMI: DatosShort["flami"] = [];
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
const CSS_FUENTES = `@font-face{font-family:'GTAPD';src:url('${staticFile("Pricedown.otf")}') format('opentype');font-weight:100 900;font-style:normal}
*{font-synthesis:none}`;

const Subtitulos: React.FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / FPS;
  let idx = W.findIndex(([, s, e]) => t >= s && t < e + 0.12);
  if (idx === -1) { for (let i = W.length - 1; i >= 0; i--) if (W[i][1] <= t) { idx = i; break; } }
  if (idx === -1 || ["gta-personaje", "gta-cita"].includes(P[planoEn(t)].plantilla)) return null;
  const g = GRUPO[idx];
  const n = GRUPO.findIndex((x, j) => j > idx && x !== g);
  const fin = n === -1 ? W.length : n;
  const rebote = spring({ frame: frame - Math.round(W[idx][1] * FPS), fps: FPS, config: { damping: 9, stiffness: 220 } });
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 380 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 64px", maxWidth: width - 160 }}>
        {W.slice(g, fin).map(([w], i) => {
          const act = g + i === idx;
          return (
            <span key={i} style={{
              display: "inline-block", fontFamily: "GTAPD, Montserrat, sans-serif", fontWeight: 900, fontSize: 72, letterSpacing: 1, lineHeight: 1.1,
              textTransform: "uppercase", color: act ? "#FFE02E" : "#FFFFFF",
              WebkitTextStroke: "10px #0B0620", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(11,6,32,.5)",
              transform: act ? `scale(${0.9 + 0.16 * rebote}) rotate(${(1 - rebote) * -4}deg)` : "scale(1)",
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
  const apariciones = FLAMI;
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

const Creditos: React.FC = () => (
  <div style={{ position: "absolute", bottom: 250, left: 40, color: "rgba(255,255,255,.55)",
    fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 20 }}>Imágenes: Rockstar Games</div>
);

const Marca: React.FC = () => (
  <div style={{ position: "absolute", top: 60, right: 50, color: "rgba(255,255,255,.55)",
    fontFamily: "GTAPD, Montserrat, sans-serif", fontWeight: 800, fontSize: 34 }}>@gtaoculto_es</div>
);

export const duracionDe = (d: DatosShort) => d.planos.reduce((a, p) => a + (p.segundos || 3), 0);

export const ShortGTAOculto: React.FC<{ datos: DatosShort }> = ({ datos }) => {
  P = datos.planos; W = datos.palabras; GRUPO = agrupa(W); BOOMS = datos.booms; FLAMI = datos.flami;
  golpes = W.filter(([w]) => datos.claves.includes(w)).map(([, s]) => s);
  inicios = (() => { let t = 0; return P.map((p) => { const s = t; t += p.segundos || 3; return s; }); })();
  DUR = duracionDe(datos);
  return (
  <AbsoluteFill style={{ background: "#0B0620", overflow: "hidden" }}>
      <style>{CSS_FUENTES}</style>
    <Camara><Montaje planos={P} /></Camara>
    <Flash />
    <Flami />
    <Subtitulos />
    <Creditos />
    <Marca />
    <Progreso />
    <Audio src={staticFile(datos.voz)} />
    <Audio src={staticFile("musica.wav")} volume={0.13} />
    {inicios.slice(1).map((s, i) => (
      <Sequence key={"w" + i} from={Math.max(0, Math.round((s - 0.1) * FPS))} durationInFrames={20}>
        <Audio src={staticFile("whoosh.mp3")} volume={0.2} />
      </Sequence>
    ))}
    {BOOMS.map((s, i) => (
      <Sequence key={"b" + i} from={Math.max(0, Math.round((s - 0.05) * FPS))} durationInFrames={32}>
        <Audio src={staticFile("boom.mp3")} volume={0.55} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
};
