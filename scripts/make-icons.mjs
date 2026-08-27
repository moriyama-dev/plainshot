// Generates the PNG icons from a vector description, so the repository holds no
// binary assets that nobody can edit. Run with: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'icons');
const SIZES = [16, 32, 48, 128];
const SUPERSAMPLE = 4;

const BACKGROUND = [0x1b, 0x36, 0x5d];
const PAGE = [0xff, 0xff, 0xff];
const ACCENT = [0x4c, 0x9a, 0xff];

/** Distance-free containment test for an axis-aligned rounded rectangle. */
function insideRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;
  if (x < left || x > right || y < top || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2 + 1e-9;
}

function shadeAt(x, y) {
  // Coordinates are normalised to a 1x1 square so one description serves every size.
  if (insideRoundedRect(x, y, 0.30, 0.16, 0.40, 0.62, 0.05)) return PAGE;
  if (insideRoundedRect(x, y, 0.36, 0.82, 0.28, 0.06, 0.03)) return ACCENT;
  if (insideRoundedRect(x, y, 0.03, 0.03, 0.94, 0.94, 0.22)) return BACKGROUND;
  return null;
}

function renderRgba(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const stepCount = SUPERSAMPLE * SUPERSAMPLE;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let covered = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size;
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size;
          const colour = shadeAt(x, y);
          if (!colour) continue;
          r += colour[0];
          g += colour[1];
          b += colour[2];
          covered += 1;
        }
      }
      const offset = (py * size + px) * 4;
      if (covered === 0) continue;
      pixels[offset] = Math.round(r / covered);
      pixels[offset + 1] = Math.round(g / covered);
      pixels[offset + 2] = Math.round(b / covered);
      pixels[offset + 3] = Math.round((covered / stepCount) * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  // 10..12 stay zero: deflate, adaptive filtering, no interlace.

  // Every scanline is prefixed with its filter type; 0 means "no filter".
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let row = 0; row < size; row += 1) {
    raw[row * (size * 4 + 1)] = 0;
    pixels.copy(raw, row * (size * 4 + 1) + 1, row * size * 4, (row + 1) * size * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of SIZES) {
  const file = join(OUT_DIR, `icon${size}.png`);
  writeFileSync(file, encodePng(size, renderRgba(size)));
  console.log(`icon${size}.png`);
}
