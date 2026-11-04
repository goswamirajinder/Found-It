// Makes a printable QR label for one box. Labels can also be made inside the app (Settings > Box labels).
// Run with: node tools/make-label.mjs B001 [https://you.github.io/Found-It/]
import {writeFileSync, mkdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {qrMatrix} from "../js/qr.js";
import {png} from "./png.mjs";

const code = (process.argv[2] || "B001").toUpperCase().replace(/[^A-Z0-9-]/g, "");
const base = process.argv[3] || "https://goswamirajinder.github.io/Found-It/";
const url = new URL(`./?box=${encodeURIComponent(code)}`, base).href;
const out = fileURLToPath(new URL("../labels/", import.meta.url));
mkdirSync(out, {recursive: true});
const {size, modules} = qrMatrix(url), q = 4;

// PNG: the code alone, 16 px per module, with the light margin cameras need.
const s = 16, w = (size + 2 * q) * s, px = Buffer.alloc(w * w * 4, 255);
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  if (!modules[y][x]) continue;
  for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
    const i = (((y + q) * s + dy) * w + (x + q) * s + dx) * 4;
    px[i] = px[i + 1] = px[i + 2] = 0;
  }
}
writeFileSync(`${out}box-${code}.png`, png(w, px));

// SVG: a label 6 cm wide to print and stick on the box, with the box code under the QR code.
const dim = size + 2 * q;
let d = "";
modules.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + q} ${y + q}h1v1h-1z`; }));
writeFileSync(`${out}box-${code}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="60mm" height="${Math.round(60 * (dim + 11) / dim)}mm" viewBox="0 0 ${dim} ${dim + 11}">
<rect width="${dim}" height="${dim + 11}" fill="#fff"/>
<path d="${d}" fill="#000" shape-rendering="crispEdges"/>
<text x="${dim / 2}" y="${dim + 3.4}" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="4.4">BOX ${code}</text>
<text x="${dim / 2}" y="${dim + 8.2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="2.5">Found It · scan to see what's inside</text>
</svg>
`);
console.log(`Label for box ${code}: ${url}`);
console.log(`  ${out}box-${code}.svg (to print)`);
console.log(`  ${out}box-${code}.png (to view or send)`);
