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

/**
 * The two tars disagree about globs, in opposite directions.
 *
 * macOS ships **bsdtar**, which matches wildcards in extraction patterns by
 * default and *rejects* `--wildcards` outright ("Option --wildcards is not
 * supported"). **GNU tar**, which is what every Linux CI runner has, does the
 * reverse: without `--wildcards` it treats the glob below as a literal
 * filename, warns, and exits 2 with "Not found in archive".
 *
 * So the flag is mandatory on one platform and fatal on the other, and there is
 * no single command line that works on both. It has to be decided at runtime.
 * This was invisible until the first CI run: the build was developed on macOS
 * and every Linux run died here.
 */
function wildcardsFlag() {
  try {
    const version = execFileSync("tar", ["--version"], { encoding: "utf8" });
    return /GNU tar/.test(version) ? "--wildcards " : "";
  } catch {
    return ""; // unknown tar: behave as before rather than pass a flag it may reject
  }
}

function extractTarball() {
  fs.rmSync(CONTENT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_DIR, { recursive: true });

  const url = `https://codeload.github.com/${REPO}/tar.gz/${SOURCE_REF}`;
  const wildcards = wildcardsFlag();
  log(`streaming ${REPO}@${REF_LABEL}${wildcards ? " (GNU tar)" : ""}`);
  // `--strip-components=4` drops `<repo>-<tag>/apps/electron/resources/`,
  // landing `docs/` and `release-notes/` directly in .content/.
  execFileSync(
    "/bin/sh",
    [
      "-c",
      `/usr/bin/curl -fsSL ${JSON.stringify(url)} | tar -xz ${wildcards}` +
        `-C ${JSON.stringify(CONTENT_DIR)} ` +
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
  // The feed repo is public, so a token is not required to read it. But the
  // unauthenticated GitHub API allows only 60 requests/hour *per IP*, and CI
  // runners share egress IPs with every other job on the fleet — so an
  // unauthenticated build fails intermittently for reasons that have nothing
  // to do with this repo. Authenticate when a token is available (CI always
  // has one); stay anonymous for local builds, which need no setup.
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "vorno-site-build",
  };
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) {
    const hint =
      res.status === 403 && !token
        ? " — looks like the unauthenticated rate limit; set GITHUB_TOKEN"
        : "";
    throw new Error(`release feed: HTTP ${res.status}${hint}`);
  }
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
