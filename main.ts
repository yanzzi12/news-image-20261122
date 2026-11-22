// The World on Sunday — 22 November 2026
// A deterministic, dependency-free editorial poster drawn entirely in code.
// Node 22, standard library only. Writes /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png).
// No Date, no Math.random: two runs always produce identical bytes.

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------- framebuffer ----------
type RGB = [number, number, number];
const px = new Uint8Array(W * H * 3);

function setPx(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = Math.floor(y); yy < y + h; yy++)
    for (let xx = Math.floor(x); xx < x + w; xx++) setPx(xx, yy, c);
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let yy = Math.floor(cy - r); yy <= cy + r; yy++)
    for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
      const dx = xx - cx, dy = yy - cy;
      if (dx * dx + dy * dy <= r * r) setPx(xx, yy, c);
    }
}
function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
  for (let yy = Math.floor(cy - ry); yy <= cy + ry; yy++)
    for (let xx = Math.floor(cx - rx); xx <= cx + rx; xx++) {
      const dx = (xx - cx) / rx, dy = (yy - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(xx, yy, c);
    }
}
function fillTri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: RGB): void {
  const minX = Math.floor(Math.min(x1, x2, x3)), maxX = Math.ceil(Math.max(x1, x2, x3));
  const minY = Math.floor(Math.min(y1, y2, y3)), maxY = Math.ceil(Math.max(y1, y2, y3));
  const d = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
  if (d === 0) return;
  for (let yy = minY; yy <= maxY; yy++)
    for (let xx = minX; xx <= maxX; xx++) {
      const a = ((y2 - y3) * (xx - x3) + (x3 - x2) * (yy - y3)) / d;
      const b = ((y3 - y1) * (xx - x3) + (x1 - x3) * (yy - y3)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) setPx(xx, yy, c);
    }
}
function thickLine(x1: number, y1: number, x2: number, y2: number, t: number, c: RGB): void {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1)) * 2;
  for (let s = 0; s <= steps; s++) {
    const x = x1 + ((x2 - x1) * s) / steps;
    const y = y1 + ((y2 - y1) * s) / steps;
    fillCircle(Math.round(x), Math.round(y), t / 2, c);
  }
}

// ---------- palette ----------
const INK: RGB = [13, 20, 38];        // deep navy newsprint
const PAPER: RGB = [244, 238, 222];   // warm off-white
const RED: RGB = [214, 48, 49];
const GOLD: RGB = [240, 178, 60];
const TEAL: RGB = [38, 166, 154];
const SKY: RGB = [84, 140, 210];
const ORANGE: RGB = [238, 110, 45];
const GREEN: RGB = [76, 160, 80];
const GREY: RGB = [150, 160, 175];
const DARK2: RGB = [24, 34, 56];

// ---------- 5x7 bitmap font ----------
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
};

function textWidth(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}
function drawText(cx: number, y: number, s: string, scale: number, c: RGB): void {
  let x = Math.round(cx - textWidth(s, scale) / 2);
  for (const ch of s.toUpperCase()) {
    const glyph = FONT[ch] ?? FONT[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (glyph[row][col] === '1') fillRect(x + col * scale, y + row * scale, scale, scale, c);
    x += 6 * scale;
  }
}
function drawTextLeft(x: number, y: number, s: string, scale: number, c: RGB): void {
  drawText(x + textWidth(s, scale) / 2, y, s, scale, c);
}

// ---------- scene helpers ----------
function person(cx: number, baseY: number, suit: RGB, skin: RGB, s: number): void {
  // s ~ overall scale; head + shoulders figure
  fillCircle(cx, baseY - 52 * s, 15 * s, skin);
  fillRect(cx - 20 * s, baseY - 36 * s, 40 * s, 38 * s, suit);
  fillTri(cx - 20 * s, baseY + 2 * s, cx + 20 * s, baseY + 2 * s, cx, baseY - 20 * s, suit);
  fillRect(cx - 3 * s, baseY - 34 * s, 6 * s, 22 * s, PAPER); // shirt
}
function flame(cx: number, baseY: number, s: number): void {
  fillTri(cx - 14 * s, baseY, cx + 14 * s, baseY, cx, baseY - 52 * s, ORANGE);
  fillTri(cx - 8 * s, baseY, cx + 8 * s, baseY, cx + 4 * s, baseY - 34 * s, GOLD);
  fillTri(cx - 4 * s, baseY, cx + 4 * s, baseY, cx, baseY - 18 * s, RED);
}
function star(cx: number, cy: number, r: number, c: RGB): void {
  for (let i = 0; i < 5; i++) {
    const a1 = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const a2 = -Math.PI / 2 + (((i + 1) % 5) * 4 * Math.PI) / 5;
    fillTri(cx, cy, cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2), c);
  }
}

// ---------- background ----------
fillRect(0, 0, W, H, INK);
fillRect(14, 14, W - 28, H - 28, INK);
for (let x = 14; x < W - 14; x += 2) { setPx(x, 14, PAPER); setPx(x, H - 15, PAPER); }
for (let y = 14; y < H - 14; y += 2) { setPx(14, y, PAPER); setPx(W - 15, y, PAPER); }

// ---------- masthead ----------
drawText(W / 2, 34, 'THE WORLD IN ONE DAY', 3, GOLD);
drawText(W / 2, 66, 'SUNDAY', 9, PAPER);
drawText(W / 2, 140, '22 NOVEMBER 2026', 7, PAPER);
fillRect(70, 196, W - 140, 5, RED);
drawText(W / 2, 210, 'SIX STORIES THAT SHAPED THE DAY', 2, GREY);

// ---------- panels ----------
const PX = [36, 516];
const PY = [240, 482, 724];
const PW = 472;
const PH = 230;

function panel(col: number, row: number, bg: RGB): [number, number] {
  const x = PX[col], y = PY[row];
  fillRect(x, y, PW, PH, bg);
  fillRect(x, y, PW, 4, PAPER);
  fillRect(x, y + PH - 4, PW, 4, PAPER);
  fillRect(x, y, 4, PH, PAPER);
  fillRect(x + PW - 4, y, 4, PH, PAPER);
  return [x, y];
}
function label(x: number, y: number, l1: string, l2: string): void {
  fillRect(x + 10, y + PH - 62, PW - 20, 52, INK);
  drawText(x + PW / 2, y + PH - 56, l1, 3, PAPER);
  drawText(x + PW / 2, y + PH - 32, l2, 3, GOLD);
}

// Panel 1 — APEC Shenzhen: three leaders at one table
{
  const [x, y] = panel(0, 0, [32, 52, 92]);
  fillCircle(x + 236, y + 58, 30, GOLD); // summit sun / emblem
  star(x + 236, y + 58, 17, RED);
  fillRect(x + 60, y + 150, 352, 14, [110, 74, 40]); // long table
  person(x + 110, y + 150, RED, [240, 200, 160], 1.15);
  person(x + 236, y + 150, [40, 60, 120], [240, 205, 170], 1.15);
  person(x + 362, y + 150, [60, 60, 66], [235, 195, 155], 1.15);
  fillRect(x + 26, y + 16, 6, 40, PAPER); fillRect(x + 32, y + 16, 30, 20, RED);   // CN flag block
  fillRect(x + 410, y + 16, 6, 40, PAPER); fillRect(x + 416, y + 16, 30, 20, SKY); // US/RU flag block
  label(x, y, 'XI HOSTS TRUMP + PUTIN', 'APEC SUMMIT - SHENZHEN');
}

// Panel 2 — Hormuz: tanker, strait, fire in Bahrain
{
  const [x, y] = panel(1, 0, [16, 62, 86]);
  fillRect(x + 8, y + 138, PW - 16, 26, TEAL); // sea
  fillRect(x + 150, y + 128, 190, 24, [70, 74, 82]); // tanker hull
  fillTri(x + 340, y + 128, x + 372, y + 152, x + 340, y + 152, [70, 74, 82]);
  fillRect(x + 180, y + 106, 90, 22, PAPER);
  fillRect(x + 285, y + 96, 22, 32, RED);
  fillRect(x + 30, y + 96, 66, 54, [90, 84, 70]); // industrial site
  fillRect(x + 44, y + 74, 10, 24, GREY); fillRect(x + 68, y + 74, 10, 24, GREY);
  flame(x + 63, y + 78, 1.1);
  flame(x + 420, y + 120, 0.7);
  drawText(x + 236, y + 22, 'STRAIT OF HORMUZ', 3, PAPER);
  label(x, y, 'HORMUZ BLOCKADE', 'BAHRAIN SITE ABLAZE');
}

// Panel 3 — Ukraine: missiles over Kyiv, Europe at talks table
{
  const [x, y] = panel(0, 1, [26, 30, 58]);
  for (const bx of [40, 96, 330, 386]) fillRect(x + bx, y + 88, 44, 74, [48, 64, 102]); // skyline
  for (const bx of [52, 108, 342, 398]) for (const wy of [100, 120, 140]) fillRect(x + bx, y + wy, 10, 8, GOLD);
  thickLine(x + 90, y + 30, x + 190, y + 96, 7, ORANGE); // missile trail 1
  fillTri(x + 190, y + 96, x + 172, y + 82, x + 200, y + 78, PAPER);
  thickLine(x + 380, y + 26, x + 292, y + 92, 7, ORANGE); // missile trail 2
  fillTri(x + 292, y + 92, x + 276, y + 76, x + 306, y + 74, PAPER);
  flame(x + 118, y + 100, 0.8);
  fillCircle(x + 236, y + 52, 21, SKY); // Europe circle of stars hint
  star(x + 236, y + 52, 12, GOLD);
  label(x, y, 'MISSILES HIT KYIV', 'EUROPE JOINS PEACE TALKS');
}

// Panel 4 — COP31 deadlock: factory, smoke, blocked sun
{
  const [x, y] = panel(1, 1, [38, 66, 52]);
  fillRect(x + 52, y + 108, 150, 56, [84, 88, 92]); // factory
  fillRect(x + 66, y + 66, 16, 44, GREY); fillRect(x + 104, y + 66, 16, 44, GREY);
  fillEllipse(x + 84, y + 52, 30, 15, GREY); fillEllipse(x + 128, y + 44, 36, 17, [120, 126, 132]);
  fillEllipse(x + 190, y + 56, 42, 19, [120, 126, 132]);
  fillCircle(x + 330, y + 48, 24, GOLD); // sun
  thickLine(x + 310, y + 28, x + 350, y + 68, 8, RED); // blocked: red slash
  thickLine(x + 350, y + 28, x + 310, y + 68, 8, RED);
  fillRect(x + 250, y + 118, 170, 12, [110, 74, 40]); // deadlocked table
  person(x + 282, y + 118, [60, 60, 66], [240, 200, 160], 0.8);
  person(x + 388, y + 118, [60, 60, 66], [235, 195, 155], 0.8);
  drawText(x + 130, y + 140, 'CO2', 3, PAPER);
  label(x, y, 'COP31 DEADLOCK', 'FOSSIL FUEL FIGHT');
}

// Panel 5 — Mexico: cartel boss captured
{
  const [x, y] = panel(0, 2, [52, 40, 34]);
  fillCircle(x + 150, y + 88, 46, GOLD); // badge
  star(x + 150, y + 88, 27, [146, 108, 26]);
  person(x + 330, y + 158, [50, 54, 60], [216, 164, 120], 1.25); // captured figure
  fillCircle(x + 288, y + 96, 15, GREY); // handcuff ring 1 (outline feel via double circle)
  fillCircle(x + 288, y + 96, 9, [52, 40, 34]);
  fillCircle(x + 316, y + 96, 15, GREY);
  fillCircle(x + 316, y + 96, 9, [52, 40, 34]);
  thickLine(x + 300, y + 96, x + 306, y + 96, 5, GREY);
  fillRect(x + 52, y + 150, 90, 10, GREEN); fillRect(x + 97, y + 150, 10, 0, GREEN);
  drawText(x + 118, y + 22, 'MEXICO', 3, PAPER);
  label(x, y, 'CARTEL BOSS CAPTURED', 'EL CHAPO ISIDRO ARRESTED');
}

// Panel 6 — Banda Sea quake: seismograph over waves
{
  const [x, y] = panel(1, 2, [18, 48, 84]);
  fillRect(x + 8, y + 128, PW - 16, 36, SKY); // sea band
  for (let i = 0; i < 7; i++) fillEllipse(x + 48 + i * 62, y + 140, 22, 7, PAPER); // wave caps
  const pts: [number, number][] = [
    [36, 84], [110, 84], [140, 58], [168, 112], [196, 30], [224, 128], [252, 52], [280, 84], [436, 84],
  ];
  for (let i = 0; i + 1 < pts.length; i++)
    thickLine(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], 6, RED);
  fillEllipse(x + 236, y + 118, 90, 14, GREEN); // island
  drawText(x + 84, y + 24, 'M 6.8', 4, GOLD);
  label(x, y, '6.8 QUAKE - BANDA SEA', 'OFF TIMOR-LESTE COAST');
}

// ---------- footer ----------
drawText(W / 2, 968, 'ONE DAY - SIX STORIES - ONE WORLD', 2, GREY);

// ---------- PNG encoder ----------
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let yy = 0; yy < H; yy++) {
  raw[yy * (W * 3 + 1)] = 0;
  Buffer.from(px.buffer, yy * W * 3, W * 3).copy(raw, yy * (W * 3 + 1) + 1);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
