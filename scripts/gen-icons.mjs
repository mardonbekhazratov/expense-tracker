#!/usr/bin/env node
// Zero-dep PNG icon generator (adapted from gym-tracker).
// Writes:
//   - public/icon-192.png (dev-server favicon)
//   - android/app/src/main/res/mipmap-<density>/ic_launcher*.png
//     (only if the android/ project exists)
// Re-run with `node scripts/gen-icons.mjs` if you change the design.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, crc32 } from 'node:zlib';
import { Buffer } from 'node:buffer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = resolve(ROOT, 'public');
const ANDROID_RES = resolve(ROOT, 'android/app/src/main/res');
mkdirSync(PUBLIC_DIR, { recursive: true });

const BG = [0x0a, 0x0d, 0x14, 0xff]; // ink-950
const BG_INNER = [0x16, 0x1b, 0x27, 0xff]; // ink-800
const FG = [0xff, 0xff, 0xff, 0xff];
const EMBER = [0xf2, 0x5a, 0x0e, 0xff];
const EMBER_LIGHT = [0xff, 0x9d, 0x5e, 0xff];
const AQUA = [0x1b, 0xaf, 0x7a, 0xff];
const TRANSPARENT = [0, 0, 0, 0];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makePNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rowBytes = size * 4;
  const filtered = Buffer.alloc(size * (rowBytes + 1));
  for (let y = 0; y < size; y++) {
    filtered[y * (rowBytes + 1)] = 0;
    pixels.copy(filtered, y * (rowBytes + 1) + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  const idat = deflateSync(filtered, { level: 9 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPx(buf, size, x, y, rgba) {
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = rgba[0];
  buf[i + 1] = rgba[1];
  buf[i + 2] = rgba[2];
  buf[i + 3] = rgba[3];
}

function fillRect(buf, size, x0, y0, w, h, rgba) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) setPx(buf, size, x, y, rgba);
  }
}

function fillRoundRect(buf, size, x0, y0, w, h, r, rgba) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = Math.min(x - x0, x0 + w - 1 - x);
      const dy = Math.min(y - y0, y0 + h - 1 - y);
      if (dx >= r || dy >= r) {
        setPx(buf, size, x, y, rgba);
      } else {
        const ddx = r - dx;
        const ddy = r - dy;
        if (ddx * ddx + ddy * ddy <= r * r) setPx(buf, size, x, y, rgba);
      }
    }
  }
}

function fillCircle(buf, size, cx, cy, r, rgba) {
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(buf, size, x, y, rgba);
    }
  }
}

/**
 * A wallet: ember body, lighter flap with a white clasp, and an aqua card
 * (income) peeking out of the top.
 * @param {number} size
 * @param {object} opts
 * @param {boolean} [opts.maskable]  small safe zone (PWA maskable / legacy launcher)
 * @param {boolean} [opts.foreground] transparent background + adaptive-icon safe zone
 */
function drawWallet(size, { maskable = false, foreground = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  if (!foreground) {
    for (let i = 0; i < size * size; i++) BG.forEach((v, k) => (buf[i * 4 + k] = v));
  }

  const safeScale = foreground ? 0.55 : maskable ? 0.62 : 0.84;
  const inset = Math.round((size * (1 - safeScale)) / 2);
  const inner = size - 2 * inset;
  const at = (f) => inset + Math.round(inner * f);
  const len = (f) => Math.max(1, Math.round(inner * f));

  if (!maskable && !foreground) {
    fillRoundRect(buf, size, at(0.02), at(0.02), len(0.96), len(0.96), Math.max(4, Math.round(size * 0.06)), BG_INNER);
  }

  fillRoundRect(buf, size, at(0.2), at(0.12), len(0.5), len(0.3), len(0.05), AQUA);
  fillRoundRect(buf, size, at(0.08), at(0.26), len(0.84), len(0.6), len(0.1), EMBER);
  fillRoundRect(buf, size, at(0.56), at(0.44), len(0.36), len(0.24), len(0.07), EMBER_LIGHT);
  fillCircle(buf, size, at(0.68), at(0.56), len(0.045), FG);

  void TRANSPARENT;
  return makePNG(size, buf);
}

const pwaOutputs = [{ name: 'icon-192.png', size: 192, opts: {} }];

for (const o of pwaOutputs) {
  const png = drawWallet(o.size, o.opts);
  const out = resolve(PUBLIC_DIR, o.name);
  writeFileSync(out, png);
  console.log(`wrote ${out} (${png.length} bytes)`);
}

if (existsSync(ANDROID_RES)) {
  // ic_launcher (legacy square) sizes per density
  const launcherSizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  };
  // ic_launcher_foreground sizes (adaptive icon — 108dp at each density)
  const foregroundSizes = {
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  };

  for (const [dir, size] of Object.entries(launcherSizes)) {
    const png = drawWallet(size, { maskable: true });
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const out = resolve(ANDROID_RES, dir, name);
      writeFileSync(out, png);
      console.log(`wrote ${out} (${png.length} bytes)`);
    }
  }
  for (const [dir, size] of Object.entries(foregroundSizes)) {
    const png = drawWallet(size, { foreground: true });
    const out = resolve(ANDROID_RES, dir, 'ic_launcher_foreground.png');
    writeFileSync(out, png);
    console.log(`wrote ${out} (${png.length} bytes)`);
  }
} else {
  console.log('(skipping android icons — android/ not present)');
}
