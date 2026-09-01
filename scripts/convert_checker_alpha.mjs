#!/usr/bin/env node
/**
 * Converts an ImageGen preview whose transparent background was rasterised as
 * a neutral grey/white checkerboard into a true RGBA PNG. This utility is
 * deliberately narrow: it only removes nearly-neutral, very light pixels so
 * an art reviewer must still inspect every output before it becomes runtime
 * wardrobe art.
 */
import { readFile, writeFile } from "node:fs/promises";
import { deflateSync, inflateSync } from "node:zlib";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("Usage: node scripts/convert_checker_alpha.mjs <input.png> <output.png>");

const source = await readFile(input);
const signature = source.subarray(0, 8);
if (!signature.equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error("Input must be a PNG.");

let offset = 8;
let width = 0;
let height = 0;
let bitDepth = 0;
let colorType = 0;
const idat = [];
while (offset < source.length) {
  const length = source.readUInt32BE(offset); offset += 4;
  const type = source.toString("ascii", offset, offset + 4); offset += 4;
  const data = source.subarray(offset, offset + length); offset += length + 4;
  if (type === "IHDR") {
    width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9];
  }
  if (type === "IDAT") idat.push(data);
  if (type === "IEND") break;
}
if (bitDepth !== 8 || colorType !== 2) throw new Error("Expected an 8-bit RGB PNG exported by ImageGen.");

const raw = inflateSync(Buffer.concat(idat));
const stride = width * 3;
const rows = Buffer.alloc(height * stride);
let cursor = 0;
for (let y = 0; y < height; y += 1) {
  const filter = raw[cursor++];
  const row = rows.subarray(y * stride, (y + 1) * stride);
  const prior = y ? rows.subarray((y - 1) * stride, y * stride) : undefined;
  for (let x = 0; x < stride; x += 1) {
    const value = raw[cursor++];
    const left = x >= 3 ? row[x - 3] : 0;
    const up = prior?.[x] ?? 0;
    const upLeft = x >= 3 ? (prior?.[x - 3] ?? 0) : 0;
    const paeth = () => { const p = left + up - upLeft; const a = Math.abs(p - left); const b = Math.abs(p - up); const c = Math.abs(p - upLeft); return a <= b && a <= c ? left : b <= c ? up : upLeft; };
    row[x] = (value + (filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : filter === 4 ? paeth() : 0)) & 255;
  }
}

const rgbaRows = Buffer.alloc(height * (width * 4 + 1));
for (let y = 0; y < height; y += 1) {
  const sourceRow = rows.subarray(y * stride, (y + 1) * stride);
  const targetRow = rgbaRows.subarray(y * (width * 4 + 1), (y + 1) * (width * 4 + 1));
  targetRow[0] = 0;
  for (let x = 0; x < width; x += 1) {
    const r = sourceRow[x * 3]; const g = sourceRow[x * 3 + 1]; const b = sourceRow[x * 3 + 2];
    const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 4 && Math.min(r, g, b) > 232;
    targetRow[x * 4 + 1] = r; targetRow[x * 4 + 2] = g; targetRow[x * 4 + 3] = b; targetRow[x * 4 + 4] = neutral ? 0 : 255;
  }
}

const crcTable = Uint32Array.from({ length: 256 }, (_, n) => { let c = n; for (let bit = 0; bit < 8; bit += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buffer) => { let c = 0xffffffff; for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const head = Buffer.alloc(8); head.writeUInt32BE(data.length, 0); head.write(type, 4, 4, "ascii"); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0); return Buffer.concat([head, data, crc]); };
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 6;
await writeFile(output, Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rgbaRows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
