// Draws the app icons (marigold square, navy label tape) as PNGs with no dependencies.
// Run with: node tools/make-icons.mjs
import {deflateSync} from "node:zlib";
import {writeFileSync, mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";

const out = fileURLToPath(new URL("../icons/", import.meta.url));
mkdirSync(out, {recursive: true});

const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function png(size, px) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const MARIGOLD = [242, 160, 7], NAVY = [24, 48, 79], WHITE = [244, 247, 251];
const inRound = (x, y, x0, y0, x1, y1, r) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r), cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
// Colour of one point in a 0..1 square; null is transparent.
function colourAt(x, y, fullBleed) {
  if (!fullBleed && !inRound(x, y, 0, 0, 1, 1, .22)) return null;
  if (inRound(x, y, .14, .39, .86, .61, .035)) {
    if ((x - .255) ** 2 + (y - .5) ** 2 <= .042 ** 2) return WHITE;
    for (const [a, b] of [[.35, .47], [.51, .6], [.64, .76]]) if (inRound(x, y, a, .468, b, .532, .012)) return WHITE;
    return NAVY;
  }
  return MARIGOLD;
}
function draw(size, fullBleed) {
  const px = Buffer.alloc(size * size * 4), SS = 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = colourAt((x + (sx + .5) / SS) / size, (y + (sy + .5) / SS) / size, fullBleed);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (y * size + x) * 4;
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = 255 * a / (SS * SS); }
  }
  return png(size, px);
}
writeFileSync(out + "icon-192.png", draw(192, false));
writeFileSync(out + "icon-512.png", draw(512, false));
writeFileSync(out + "maskable-512.png", draw(512, true));
writeFileSync(out + "apple-touch-icon.png", draw(180, true));
console.log("icons written to", out);
