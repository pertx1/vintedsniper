#!/usr/bin/env node
'use strict';

// Draws the app icon (a target / crosshair) as PNG files without any image library.
// Run: node scripts/generate-icons.js

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const BG = [15, 17, 21];
const FG = [9, 177, 186]; // Vinted-ish teal
const ACCENT = [255, 90, 95];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = Array.from({ length: 256 }, (_, n) => {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}


// Coverage-based drawing with 4x4 supersampling for smooth edges.
function icon(size, { padding = 0 } = {}) {
  const s = size / (1 - padding * 2);
  const off = (s - size) / 2;
  function shape(px, py) {
    const x = (px + off) / s - 0.5;
    const y = (py + off) / s - 0.5;
    const r = Math.hypot(x, y);
    if (r < 0.06) return ACCENT;
    if (Math.abs(r - 0.3) < 0.035) return FG;
    if (Math.abs(r - 0.17) < 0.025) return FG;
    const arm = 0.022;
    if ((Math.abs(x) < arm && r > 0.2 && r < 0.42) || (Math.abs(y) < arm && r > 0.2 && r < 0.42)) return FG;
    return BG;
  }
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const c = shape(x + (i + 0.5) / 4, y + (j + 0.5) / 4);
      acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2];
    }
    return acc.map((v) => Math.round(v / 16));
  });
}

const out = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon-192.png'), icon(192));
fs.writeFileSync(path.join(out, 'icon-512.png'), icon(512));
fs.writeFileSync(path.join(out, 'icon-maskable-512.png'), icon(512, { padding: 0.1 }));
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), icon(180));
fs.writeFileSync(path.join(out, 'badge-96.png'), icon(96));
console.log('Iconos generados en', out);
