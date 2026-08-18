// Fetch the published source content for /docs and /changelog.
//
//   1. Stream the repo tarball at TAG and extract only the two resource dirs.
//   2. Fetch the release feed (the authoritative list of what actually shipped).
//   3. Backfill release notes for released versions whose notes file is absent
//      at TAG. `0.11.4.md` is the known case: it exists at tag v0.11.4 but not
//      at v0.16.0, so a single-tag build would silently drop a shipped version
//      from the changelog.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  CONTENT_DIR,
  DOCS_SRC,
  NOTES_SRC,
  NOTES_FALLBACK,
  RELEASES_JSON,
  RELEASES_REPO,
  REPO,
  REF_LABEL,
  SOURCE_REF,
  TAG,
} from "./config.mjs";

function log(...args) {
  console.log("[fetch]", ...args);
}

function extractTarball() {
  fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const url = `https://codeload.github.com/${REPO}/tar.gz/${SOURCE_REF}`;
  log(`streaming ${REPO}@${REF_LABEL}`);
  // `--strip-components=4` drops `<repo>-<tag>/apps/electron/resources/`,
  // landing `docs/` and `release-notes/` directly in .content/.
  execFileSync(
    "/bin/sh",
    [
      "-c",
      `/usr/bin/curl -fsSL ${JSON.stringify(url)} | tar -xz -C ${JSON.stringify(CONTENT_DIR)} ` +
        `--strip-components=4 '*/apps/electron/resources/docs/*' ` +
        `'*/apps/electron/resources/release-notes/*'`,
    ],
    { stdio: ["ignore", "inherit", "inherit"] },
  );

  if (!fs.existsSync(DOCS_SRC) || !fs.existsSync(NOTES_SRC)) {
    throw new Error(`tarball for ${REF_LABEL} did not contain the expected resource dirs`);
  }
  log(
    `${fs.readdirSync(DOCS_SRC).length} docs, ` +
      `${fs.readdirSync(NOTES_SRC).length} release-note files`,
  );
}

async function fetchReleases() {
  const url = `https://api.github.com/repos/${RELEASES_REPO}/releases?per_page=100`;
  const res = await fetch(url, {
    headers: { accept: "application/vnd.github+json", "user-agent": "vorno-site-build" },
  });
  if (!res.ok) throw new Error(`release feed: HTTP ${res.status}`);
  const releases = (await res.json())
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: r.tag_name,
      version: r.tag_name.replace(/^v/, ""),
      publishedAt: r.published_at,
      htmlUrl: r.html_url,
      prerelease: r.prerelease,
    }));
  fs.writeFileSync(RELEASES_JSON, JSON.stringify(releases, null, 2));
  log(`${releases.length} published releases (${releases.at(-1)?.tag} … ${releases[0]?.tag})`);
  return releases;
}

async function backfillNotes(releases) {
  fs.mkdirSync(NOTES_FALLBACK, { recursive: true });
  const missing = releases.filter(
    (r) => !fs.existsSync(path.join(NOTES_SRC, `${r.version}.md`)),
  );
  for (const r of missing) {
    const raw = `https://raw.githubusercontent.com/${REPO}/${r.tag}/apps/electron/resources/release-notes/${r.version}.md`;
    const res = await fetch(raw, { headers: { "user-agent": "vorno-site-build" } });
    if (!res.ok) {
      log(`! ${r.version}: no notes at ${TAG} and none at ${r.tag} (HTTP ${res.status})`);
      continue;
    }
    fs.writeFileSync(path.join(NOTES_FALLBACK, `${r.version}.md`), await res.text());
    log(`backfilled ${r.version}.md from ${r.tag} (absent at ${TAG})`);
  }
}

const releases = await (async () => {
  extractTarball();
  const rels = await fetchReleases();
  await backfillNotes(rels);
  return rels;
})();

log(`content ready for ${REF_LABEL} (${releases.length} releases)`);
