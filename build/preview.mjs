// Build and serve the site from an arbitrary ref, without touching production.
//
//   VORNO_REF=my-branch npm run preview
//   VORNO_REF=ca1ac9c   npm run preview
//
// Exists so work can be verified over real HTTP through the actual Worker
// *before* it is frozen into a release tag. Finding a routing problem after the
// tag is cut is the expensive version of finding it.
//
// The committed output under public/ is never written: preview builds go to
// .preview/public (gitignored), seeded from the current public/ so the
// hand-written marketing pages are present, then overwritten in /docs and
// /changelog by the ref being previewed.

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { IS_PREVIEW, PREVIEW_DIR, REF_LABEL, ROOT } from "./config.mjs";

if (!IS_PREVIEW) {
  console.error(
    "[preview] VORNO_REF is not set.\n" +
      "          Usage: VORNO_REF=<branch|sha|tag> npm run preview\n" +
      "          (Without it this would rebuild production output in public/.)",
  );
  process.exit(1);
}

const PORT = process.env.PORT || "8791";
const previewPublic = path.join(PREVIEW_DIR, "public");

// Seed from the committed site so /, /download, /links, /blog exist.
fs.rmSync(PREVIEW_DIR, { recursive: true, force: true });
fs.mkdirSync(PREVIEW_DIR, { recursive: true });
fs.cpSync(path.join(ROOT, "public"), previewPublic, { recursive: true });

const run = (script, { fatal = true } = {}) => {
  try {
    execFileSync("node", [path.join(ROOT, "build", script)], {
      cwd: ROOT,
      stdio: "inherit",
      env: process.env,
    });
    return true;
  } catch (err) {
    if (fatal) throw err;
    return false;
  }
};

run("fetch-content.mjs");
run("build-docs.mjs");
run("build-changelog.mjs");

// Verification is reported but does NOT stop a preview from serving. A preview
// exists to look at rendering and routing; refusing to serve because the ref
// carries a content defect would hide the very pages someone is trying to
// check. It still fails the real build — see the banner below.
const clean = run("verify.mjs", { fatal: false });

// A Worker config pointing at the preview output. Same worker script and same
// assets behaviour as wrangler.jsonc, so routing is exercised for real.
const base = JSON.parse(
  fs
    .readFileSync(path.join(ROOT, "wrangler.jsonc"), "utf8")
    .replace(/^\s*\/\/.*$/gm, ""),
);
const cfg = {
  ...base,
  name: "vorno-site-preview",
  main: path.join(ROOT, "worker", "index.js"),
  assets: { ...base.assets, directory: previewPublic },
};
delete cfg.routes; // never bind a preview to the live custom domains
const cfgPath = path.join(PREVIEW_DIR, "wrangler.json");
fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));

console.log(`\n[preview] serving ${REF_LABEL} on http://localhost:${PORT}`);
console.log(`[preview] production output in public/ is untouched`);
if (!clean) {
  console.log(
    `[preview] ⚠ VERIFICATION FAILED for ${REF_LABEL} (see above). Serving anyway so\n` +
      `[preview]   you can inspect the pages — but a real build of this ref WOULD NOT\n` +
      `[preview]   publish. Fix it before the ref is tagged.`,
  );
}
console.log(`[preview] verify with: /usr/bin/curl -sL -o /dev/null -w '%{http_code}' http://localhost:${PORT}/docs/\n`);

spawn("npx", ["wrangler", "dev", "-c", cfgPath, "--port", PORT, "--local"], {
  cwd: ROOT,
  stdio: "inherit",
}).on("exit", (code) => process.exit(code ?? 0));
