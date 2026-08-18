// Shared build configuration.
//
// Published docs and changelog are built from the *public* Swagatar-LLC/vorno
// repo at a git tag, so what vorno.ai serves is exactly what shipped in that
// build (ADR-0023). `VORNO_TAG` makes the tag a build parameter for the release
// pipeline (PLAN-034 Lane C).

import { fileURLToPath } from "node:url";
import path from "node:path";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export const REPO = "Swagatar-LLC/vorno";
export const RELEASES_REPO = "Swagatar-LLC/vorno-releases";

export const TAG = process.env.VORNO_TAG || "v0.16.0";

export const CONTENT_DIR = path.join(ROOT, ".content");
export const DOCS_SRC = path.join(CONTENT_DIR, "docs");
export const NOTES_SRC = path.join(CONTENT_DIR, "release-notes");
export const NOTES_FALLBACK = path.join(CONTENT_DIR, "release-notes-fallback");
export const RELEASES_JSON = path.join(CONTENT_DIR, "releases.json");

export const PUBLIC_DIR = path.join(ROOT, "public");
export const DOCS_OUT = path.join(PUBLIC_DIR, "docs");
export const CHANGELOG_OUT = path.join(PUBLIC_DIR, "changelog");

export const ASTRO_ROOT = path.join(ROOT, "docs-src");

// The two lines that must appear verbatim in every page footer, generated or
// hand-written. Trademark clearance for "Vorno" is still in flight, so the
// non-affiliation line is legally load-bearing — build/verify.mjs enforces it.
export const FOOTER_DISCLAIMER =
  "Vorno is not affiliated with or endorsed by Craft Docs Ltd.";
export const FOOTER_POWERED = "Powered by Claude.";

// Vorno's own release line starts at 0.11.2 (ADR-0010). Anything at or below
// 0.11.1 is shared history with the upstream project: there is no Vorno build
// to download for those versions, and their notes describe a differently-named
// product. See build-changelog.mjs.
export const FIRST_VORNO_VERSION = "0.11.2";

export function compareVersions(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}
