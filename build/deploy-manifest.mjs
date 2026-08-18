// Build the Workers assets manifest exactly the way wrangler does.
//
// Only needed because this machine has no wrangler credentials — the Cloudflare
// token lives in the workspace source and is reachable through its API only, so
// the deploy runs against the REST API the same way the initial 2026-07-26
// deploy did. `bunx wrangler deploy` remains the normal path.
//
// Hash algorithm lifted from wrangler's own `hashFile`:
//   blake3(base64(contents) + extensionWithoutDot).hex().slice(0, 32)

import fs from "node:fs";
import path from "node:path";
import blake3 from "blake3-wasm";
import { PUBLIC_DIR, ROOT } from "./config.mjs";

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/vnd.microsoft.icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".pf_meta": "application/octet-stream",
  ".pf_index": "application/octet-stream",
  ".pf_fragment": "application/octet-stream",
};

export function contentType(file) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name !== ".DS_Store") out.push(p);
  }
  return out;
}

export function buildManifest() {
  const files = walk(PUBLIC_DIR).sort();
  const manifest = {};
  const byHash = {};
  for (const abs of files) {
    const contents = fs.readFileSync(abs);
    const ext = path.extname(abs).substring(1);
    const hash = blake3
      .hash(contents.toString("base64") + ext)
      .toString("hex")
      .slice(0, 32);
    const key = "/" + path.relative(PUBLIC_DIR, abs).split(path.sep).join("/");
    manifest[key] = { hash, size: contents.length };
    byHash[hash] = { abs, key, contentType: contentType(abs) };
  }
  return { manifest, byHash, count: files.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { manifest, byHash, count } = buildManifest();
  const out = path.join(ROOT, ".content", "deploy");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify(manifest));
  fs.writeFileSync(path.join(out, "by-hash.json"), JSON.stringify(byHash, null, 2));
  console.log(`[manifest] ${count} files, ${Object.keys(byHash).length} unique hashes`);
  console.log(`[manifest] wrote ${path.relative(ROOT, out)}/manifest.json`);
}
