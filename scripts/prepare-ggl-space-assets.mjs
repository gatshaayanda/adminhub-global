import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();
const archive = path.join(root, "src/app/ggltournaments/game-assets/kenney_simple-space.zip");
const output = path.join(root, "public/game-assets/space");
const manifestPath = path.join(output, "manifest.json");

function entriesOf(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 22 - 65535); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Simple Space ZIP has no end-of-central-directory record.");
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const result = [];
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid ZIP central directory entry.");
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const size = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8").replaceAll("\\", "/");
    result.push({ name, method, compressedSize, size, localOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

function unpack(buffer, entry) {
  const offset = entry.localOffset;
  if (buffer.readUInt32LE(offset) !== 0x04034b50) throw new Error("Invalid ZIP entry: " + entry.name);
  const nameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const start = offset + 30 + nameLength + extraLength;
  const compressed = buffer.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return Buffer.from(compressed);
  if (entry.method === 8) return zlib.inflateRawSync(compressed);
  throw new Error("Unsupported ZIP compression " + entry.method + " for " + entry.name);
}

function safeRelative(name) {
  const normalized = path.posix.normalize(name.replace(/^\/+/, ""));
  if (normalized.startsWith("../") || normalized === "..") throw new Error("Unsafe ZIP path: " + name);
  return normalized;
}

if (!fs.existsSync(archive)) throw new Error("Missing Kenney Simple Space source pack: " + archive);
const zip = fs.readFileSync(archive);
const entries = entriesOf(zip).filter((entry) => !entry.name.endsWith("/"));
const selected = entries.filter((entry) =>
  entry.name.startsWith("PNG/Retina/") && /\.png$/i.test(entry.name) ||
  entry.name.toLowerCase() === "license.txt"
);
if (!selected.some((entry) => entry.name === "PNG/Retina/ship_A.png") ||
    !selected.some((entry) => entry.name === "PNG/Retina/enemy_A.png")) {
  throw new Error("The Simple Space pack is missing expected ship/enemy sprites.");
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
const manifest = [];
for (const entry of selected) {
  const relative = safeRelative(entry.name);
  const destination = path.join(output, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, unpack(zip, entry));
  manifest.push({ path: "/game-assets/space/" + relative.split("/").map(encodeURIComponent).join("/"), bytes: entry.size });
}
fs.writeFileSync(manifestPath, JSON.stringify({
  source: "Kenney Simple Space",
  license: "CC0 1.0",
  assets: manifest.sort((a, b) => a.path.localeCompare(b.path))
}, null, 2) + "\n");
console.log("Prepared " + manifest.length + " Kenney Simple Space files for GGL.");
