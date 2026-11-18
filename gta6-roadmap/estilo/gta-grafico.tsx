import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PALETA, TIPO, Lienzo, useU } from "./gta-base";

/**
 * MOTION GRAPHICS: explicar una mecánica con un gráfico que se mueve.
 * ==================================================================
 * Cuatro tipos, elegidos con `tipo`:
 *   rastreador  mapa en cuadrícula, una ruta que se dibuja y un punto que late (GPS, policía, rutas)
 *   velocimetro aguja que sube hasta `value` sobre `unit` máximo (velocidad, nivel de búsqueda…)
 *   precio      barra que se llena y cifra "+$X" que cuenta (dinero, valor de un coche)
 *   app         móvil con una app que escanea y va mostrando `items` (WAiNK, menús)
 * `text` es la etiqueta en píldora; `topText` la línea pequeña de arriba.
 * Fondo: `imageUrl` desenfocado y oscurecido, o el lienzo de la casa.
 */
export interface GtaGraficoProps {
  tipo?: "rastreador" | "velocimetro" | "precio" | "app";
  text?: string;
  topText?: string;
  value?: number;
  unit?: string;
  items?: string[];
  imageUrl?: string;
}

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

const Pildora: React.FC<{ text: string; u: number; color?: string; y?: number }> = ({ text, u, color = PALETA.rosa, y = 30 }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [4, 12], [0.6, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: `${y}%`, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div style={{ transform: `scale(${s})`, display: "flex", alignItems: "center", gap: u * 1.2, padding: `${u * 1}px ${u * 2.4}px`,
        borderRadius: u * 4, border: `${u * 0.35}px solid ${color}`, background: "rgba(11,6,32,0.78)", boxShadow: `0 0 ${u * 3}px ${color}88` }}>
        <div style={{ width: u * 1.6, height: u * 1.6, borderRadius: "50%", background: color }} />
        <span style={{ fontFamily: TIPO.grito, fontSize: u * 3.4, color: PALETA.blanco, letterSpacing: u * 0.15, textTransform: "uppercase" }}>{text}</span>
      </div>
    </div>
  );
};

const Rastreador: React.FC<{ u: number; w: number; h: number }> = ({ u, w, h }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ease(f / (fps * 1.6));
  const pts = [[0.12, 0.78], [0.3, 0.7], [0.42, 0.52], [0.6, 0.5], [0.72, 0.42], [0.86, 0.36]].map(([x, y]) => [x * w, y * h]);
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1]}`).join(" ");
  const len = 2200;
  const k = Math.min(pts.length - 1, Math.floor(p * (pts.length - 1)));
  const fr = p * (pts.length - 1) - k;
  const a = pts[k], b = pts[Math.min(pts.length - 1, k + 1)];
  const cx = a[0] + (b[0] - a[0]) * fr, cy = a[1] + (b[1] - a[1]) * fr;
  const late = 1 + 0.5 * Math.abs(Math.sin(f / 5));
  const grid = [];
  for (let x = 0; x <= w; x += w / 9) grid.push(<line key={"x" + x} x1={x} y1={0} x2={x + w * 0.15} y2={h} stroke={PALETA.purpura} strokeWidth={2} opacity={0.55} />);
  for (let y = h * 0.15; y <= h; y += h / 14) grid.push(<line key={"y" + y} x1={0} y1={y} x2={w} y2={y - h * 0.05} stroke={PALETA.purpura} strokeWidth={2} opacity={0.55} />);
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      <g transform={`rotate(-8 ${w / 2} ${h / 2})`}>{grid}</g>
      <path d={d} stroke={PALETA.rosa} strokeWidth={u * 0.9} fill="none" strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} style={{ filter: `drop-shadow(0 0 ${u}px ${PALETA.rosa})` }} />
      <circle cx={cx} cy={cy} r={u * 2.6 * late} fill={PALETA.rosa} opacity={0.25} />
      <circle cx={cx} cy={cy} r={u * 1.6} fill={PALETA.blanco} stroke={PALETA.rosa} strokeWidth={u * 0.5} />
    </svg>
  );
};

const Velocimetro: React.FC<{ u: number; w: number; h: number; value: number; max: number }> = ({ u, w, h, value, max }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ease(f / (fps * 1.2));
  const r = w * 0.34, cx = w / 2, cy = h * 0.5;
  const ang = (t: number) => Math.PI * (0.75 + 1.5 * t);
  const arc = (t0: number, t1: number) => {
    const a0 = ang(t0), a1 = ang(t1);
    return `M${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)} A${r},${r} 0 ${t1 - t0 > 0.66 ? 1 : 0} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`;
  };
  const t = (value / max) * p;
  const na = ang(t);
  const marcas = [];
  for (let i = 0; i <= 10; i++) {
    const a = ang(i / 10);
    marcas.push(<line key={i} x1={cx + (r - u * 3) * Math.cos(a)} y1={cy + (r - u * 3) * Math.sin(a)} x2={cx + (r - u * 1.2) * Math.cos(a)} y2={cy + (r - u * 1.2) * Math.sin(a)} stroke={PALETA.blanco} strokeWidth={u * 0.4} opacity={0.8} />);
  }
  return (
    <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
      <path d={arc(0, 1)} stroke="rgba(255,255,255,0.15)" strokeWidth={u * 2} fill="none" strokeLinecap="round" />
      <path d={arc(0, Math.max(0.001, t))} stroke={PALETA.rosa} strokeWidth={u * 2} fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${u}px ${PALETA.rosa})` }} />
      {marcas}
      <line x1={cx} y1={cy} x2={cx + (r - u * 4) * Math.cos(na)} y2={cy + (r - u * 4) * Math.sin(na)} stroke={PALETA.rotulo} strokeWidth={u * 0.8} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={u * 1.8} fill={PALETA.rotulo} />
      <text x={cx} y={cy + r * 0.62} textAnchor="middle" fontFamily={TIPO.grito} fontSize={u * 9} fill={PALETA.blanco}>{Math.round(value * p)}</text>
    </svg>
  );
};

const Precio: React.FC<{ u: number; w: number; h: number; value: number; unit: string }> = ({ u, w, h, value, unit }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = ease(f / (fps * 1.4));
  const y = h * 0.52, x0 = w * 0.1, x1 = w * 0.9;
  const n = Math.round(value * p).toLocaleString("es-ES");
  return (
    <>
      <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke="rgba(255,255,255,0.18)" strokeWidth={u * 1.4} strokeLinecap="round" />
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * p} y2={y} stroke={PALETA.rosa} strokeWidth={u * 1.4} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 ${u}px ${PALETA.rosa})` }} />
        <circle cx={x0 + (x1 - x0) * p} cy={y} r={u * 2} fill={PALETA.blanco} stroke={PALETA.rosa} strokeWidth={u * 0.5} />
      </svg>
      <div style={{ position: "absolute", top: "37%", width: "100%", textAlign: "center", fontFamily: TIPO.grito, fontSize: u * 11, color: PALETA.rotulo,
        textShadow: `0 ${u * 0.5}px 0 ${PALETA.tinta}` }}>+{unit || "$"}{n}</div>
    </>
  );
};

const App: React.FC<{ u: number; w: number; h: number; items: string[] }> = ({ u, w, h, items }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pw = w * 0.56, ph = h * 0.4, px = (w - pw) / 2, py = h * 0.29;
  const scan = ((f / fps) * 0.9) % 1;
  const entra = interpolate(f, [0, 8], [h * 0.08, 0], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: px, top: py + entra, width: pw, height: ph, borderRadius: u * 4, background: "linear-gradient(180deg,#1b1240,#0b0620)",
      border: `${u * 0.5}px solid rgba(255,255,255,0.25)`, boxShadow: `0 0 ${u * 5}px ${PALETA.magenta}66`, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: `${scan * 100}%`, height: u * 0.6, background: PALETA.rotulo, boxShadow: `0 0 ${u * 3}px ${PALETA.rotulo}` }} />
      <div style={{ padding: u * 2.4, display: "flex", flexDirection: "column", gap: u * 1.6 }}>
        {items.map((it, i) => {
          const o = interpolate(f, [10 + i * 9, 16 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ opacity: o, transform: `translateX(${(1 - o) * u * 4}px)`, display: "flex", alignItems: "center", gap: u * 1.2,
              background: "rgba(255,255,255,0.08)", borderRadius: u * 1.4, padding: `${u * 1.2}px ${u * 1.6}px` }}>
              <div style={{ width: u * 1.4, height: u * 1.4, borderRadius: "50%", background: i % 2 ? PALETA.rosa : PALETA.rotulo }} />
              <span style={{ fontFamily: TIPO.grito, fontSize: u * 2.6, color: PALETA.blanco, textTransform: "uppercase" }}>{it}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const GtaGrafico: React.FC<GtaGraficoProps> = ({ tipo = "rastreador", text, topText, value = 100, unit = "", items = [], imageUrl }) => {
  const { width: w, height: h } = useVideoConfig();
  const f = useCurrentFrame();
  const u = useU();
  return (
    <AbsoluteFill style={{ background: PALETA.tinta, overflow: "hidden" }}>
      {imageUrl ? (
        <>
          <Img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) saturate(1.2)", transform: `scale(${1.1 + f / 2000})` }} />
          <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(23,14,70,0.55), rgba(11,6,32,0.85))" }} />
        </>
      ) : (
        <Lienzo />
      )}
      {tipo === "rastreador" && <Rastreador u={u} w={w} h={h} />}
      {tipo === "velocimetro" && <Velocimetro u={u} w={w} h={h} value={value} max={Number(unit) || 100} />}
      {tipo === "precio" && <Precio u={u} w={w} h={h} value={value} unit={unit} />}
      {tipo === "app" && <App u={u} w={w} h={h} items={items} />}
      {topText && (
        <div style={{ position: "absolute", top: "13%", width: "100%", textAlign: "center", fontFamily: TIPO.grito, fontSize: u * 3, color: PALETA.amarillo, letterSpacing: u * 0.2, textTransform: "uppercase" }}>{topText}</div>
      )}
      {text && <Pildora text={text} u={u} y={tipo === "app" ? 20 : tipo === "velocimetro" ? 22 : 24} />}
    </AbsoluteFill>
  );
};

export default GtaGrafico;
