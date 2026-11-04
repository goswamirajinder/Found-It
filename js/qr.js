// QR codes for box labels: byte mode, error correction level M, versions 1 to 10 (up to 213 bytes).
// Follows the QR Code standard (ISO/IEC 18004). No DOM access, so tools/make-label.mjs can use it too.

const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];
const ALIGN = [[], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

function rawModules(v) {
  let r = (16 * v + 128) * v + 64;
  if (v >= 2) {
    const na = Math.floor(v / 7) + 2;
    r -= (25 * na - 10) * na - 55;
    if (v >= 7) r -= 36;
  }
  return r;
}
const dataCodewords = v => Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v] * BLOCKS[v];

function gfMul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
function rsDivisor(deg) {
  const r = new Array(deg).fill(0);
  r[deg - 1] = 1;
  let root = 1;
  for (let i = 0; i < deg; i++) {
    for (let j = 0; j < deg; j++) {
      r[j] = gfMul(r[j], root);
      if (j + 1 < deg) r[j] ^= r[j + 1];
    }
    root = gfMul(root, 2);
  }
  return r;
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0);
  for (const b of data) {
    const f = b ^ r.shift();
    r.push(0);
    div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
  }
  return r;
}

function dataBytes(bytes, v) {
  const cap = dataCodewords(v) * 8, bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(4, 4);
  put(bytes.length, v < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, cap - bits.length));
  put(0, (8 - bits.length % 8) % 8);
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
  const out = [];
  for (let i = 0; i < bits.length; i += 8) out.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  return out;
}
function withEcc(data, v) {
  const nb = BLOCKS[v], ecl = ECC_PER_BLOCK[v], raw = Math.floor(rawModules(v) / 8);
  const nShort = nb - raw % nb, shortLen = Math.floor(raw / nb), div = rsDivisor(ecl), blocks = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - ecl + (i < nShort ? 0 : 1));
    k += dat.length;
    const ecc = rsRemainder(dat, div);
    if (i < nShort) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const out = [];
  for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== shortLen - ecl || j >= nShort) out.push(b[i]); });
  return out;
}

function drawFormat(put, n, mask) {
  const data = mask; // level M's two format bits are 00
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  const bits = ((data << 10) | rem) ^ 0x5412, bit = i => ((bits >>> i) & 1) === 1;
  for (let i = 0; i <= 5; i++) put(8, i, bit(i));
  put(8, 7, bit(6));
  put(8, 8, bit(7));
  put(7, 8, bit(8));
  for (let i = 9; i < 15; i++) put(14 - i, 8, bit(i));
  for (let i = 0; i < 8; i++) put(n - 1 - i, 8, bit(i));
  for (let i = 8; i < 15; i++) put(8, n - 15 + i, bit(i));
  put(8, n - 8, true);
}
const MASKS = [
  (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
  (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
];
// Lower is easier for cameras to read: long runs, 2x2 blocks, finder look-alikes and uneven dark/light all cost.
function penalty(m, n) {
  let p = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const line = [];
      for (let j = 0; j < n; j++) line.push(pass ? m[j][i] : m[i][j]);
      let run = 1;
      for (let j = 1; j <= n; j++) {
        if (j < n && line[j] === line[j - 1]) run++;
        else { if (run >= 5) p += run - 2; run = 1; }
      }
      for (let j = 0; j + 7 <= n; j++) {
        if (line[j] && !line[j + 1] && line[j + 2] && line[j + 3] && line[j + 4] && !line[j + 5] && line[j + 6]) {
          const light = (a, b) => { for (let k = a; k < b; k++) if (k >= 0 && k < n && line[k]) return false; return true; };
          if (light(j - 4, j) || light(j + 7, j + 11)) p += 40;
        }
      }
    }
  }
  for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) {
    const c = m[y][x];
    if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3;
  }
  let dark = 0;
  for (const r of m) for (const c of r) if (c) dark++;
  return p + 10 * (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1);
}

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let v = 1;
  while (v <= 10 && dataCodewords(v) * 8 < 4 + (v < 10 ? 8 : 16) + bytes.length * 8) v++;
  if (v > 10) throw new Error("Too much text for a QR label");
  const n = v * 4 + 17;
  const m = Array.from({length: n}, () => new Array(n).fill(false));
  const fn = Array.from({length: n}, () => new Array(n).fill(false));
  const set = (x, y, d) => { m[y][x] = d; fn[y][x] = true; };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
      if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4);
    }
  };
  finder(3, 3);
  finder(n - 4, 3);
  finder(3, n - 4);
  const al = ALIGN[v], last = al.length - 1;
  al.forEach((ax, i) => al.forEach((ay, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  drawFormat(set, n, 0);
  if (v >= 7) {
    let rem = v;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (v << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const d = ((bits >>> i) & 1) === 1, a = n - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, d);
      set(b, a, d);
    }
  }
  const cw = withEcc(dataBytes(bytes, v), v);
  let k = 0;
  for (let right = n - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
      if (!fn[y][x] && k < cw.length * 8) { m[y][x] = ((cw[k >>> 3] >>> (7 - (k & 7))) & 1) === 1; k++; }
    }
  }
  let best = null;
  MASKS.forEach((mf, mask) => {
    const t = m.map((r, y) => r.map((c, x) => (!fn[y][x] && mf(x, y) ? !c : c)));
    drawFormat((x, y, d) => { t[y][x] = d; }, n, mask);
    const p = penalty(t, n);
    if (!best || p < best.p) best = {p, t, mask};
  });
  return {size: n, version: v, mask: best.mask, modules: best.t};
}

// A square SVG with the light margin cameras need around the code.
export function qrSvg(text, margin = 4) {
  const {size, modules} = qrMatrix(text), dim = size + margin * 2;
  let d = "";
  modules.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x + margin} ${y + margin}h1v1h-1z`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
}
