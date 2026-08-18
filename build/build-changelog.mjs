// Build /changelog from the release notes that shipped, cross-checked against
// the public release feed.
//
// Scope: Vorno's own release line only (>= 0.11.2, ADR-0010). Versions at or
// below 0.11.1 are shared history with the upstream project — there is no Vorno
// build to download for any of them (the release feed starts at v0.11.2), and
// their notes describe a differently-named product. Republishing them under
// vorno.ai would be both unusable and an affiliation claim we explicitly
// disclaim in the footer. The index links out to the upstream project instead.

import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import {
  CHANGELOG_OUT,
  FIRST_VORNO_VERSION,
  NOTES_FALLBACK,
  NOTES_SRC,
  RELEASES_JSON,
  ROOT,
  TAG,
  compareVersions,
} from "./config.mjs";
import { layout } from "./layout.mjs";

function log(...args) {
  console.log("[changelog]", ...args);
}

const RELEASES_BASE = "https://github.com/Swagatar-LLC/vorno-releases/releases";

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function readNotes(version) {
  for (const dir of [NOTES_SRC, NOTES_FALLBACK]) {
    const p = path.join(dir, `${version}.md`);
    if (fs.existsSync(p)) return { body: fs.readFileSync(p, "utf8"), from: dir };
  }
  return null;
}

/** Strip a redundant leading H1 (`# 0.16.0`, `# v0.11.2 — Title`) and keep its text. */
function splitHeading(version, md) {
  const m = md.match(/^\s*#\s+(.+?)\s*$/m);
  if (!m || md.slice(0, md.indexOf(m[0])).trim() !== "") {
    return { headline: null, body: md };
  }
  const text = m[1].trim();
  const bare = new RegExp(`^v?${version.replace(/\./g, "\\.")}\\s*[—–-]?\\s*`, "i");
  const headline = text.replace(bare, "").trim() || null;
  return {
    headline,
    body: md.slice(md.indexOf(m[0]) + m[0].length).replace(/^\n+/, ""),
  };
}

/** One-line summary for the index: the lead paragraph, else the first bullet. */
function summarize(md) {
  const noHeadings = md.replace(/^#{1,6}\s.*$/gm, "");
  const para = noHeadings
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .find((s) => s && !/^[-*+]\s/.test(s) && !s.startsWith("```"));
  const bullet = noHeadings
    .split("\n")
    .map((s) => s.trim())
    .find((s) => /^[-*+]\s/.test(s));
  const raw = (para || bullet || "").replace(/^[-*+]\s*/, "");
  const text = raw
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 260 ? `${text.slice(0, 257).trimEnd()}…` : text;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(RELEASES_JSON)) {
  throw new Error(`missing ${RELEASES_JSON} — run \`npm run fetch\` first`);
}

const releases = JSON.parse(fs.readFileSync(RELEASES_JSON, "utf8"))
  .filter((r) => compareVersions(r.version, FIRST_VORNO_VERSION) >= 0)
  .sort((a, b) => compareVersions(b.version, a.version));

if (!releases.length) throw new Error("release feed returned no Vorno releases");

marked.setOptions({ mangle: false, headerIds: false, gfm: true });

const entries = [];
for (const r of releases) {
  const notes = readNotes(r.version);
  if (!notes) {
    log(`! ${r.version}: no release notes found in the repo at ${TAG} or at ${r.tag}`);
  }
  const md = notes?.body ?? "";
  const { headline, body } = splitHeading(r.version, md);
  entries.push({
    ...r,
    headline,
    summary: notes ? summarize(body) : null,
    html: notes
      ? marked.parse(body)
      : `<p>No release notes were published for this version. The build and its ` +
        `assets are on the <a href="${r.htmlUrl}">GitHub release</a>.</p>`,
  });
}

fs.rmSync(CHANGELOG_OUT, { recursive: true, force: true });
fs.mkdirSync(CHANGELOG_OUT, { recursive: true });

// --- per-version pages -----------------------------------------------------

for (const [i, e] of entries.entries()) {
  const prev = entries[i + 1];
  const next = entries[i - 1];
  const nav = [
    next ? `<a href="/changelog/${next.version}/">← ${next.version}</a>` : "",
    `<a href="/changelog">All releases</a>`,
    prev ? `<a href="/changelog/${prev.version}/">${prev.version} →</a>` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const main = `  <p class="crumb"><a href="/changelog">Changelog</a></p>
  <h1>Vorno ${esc(e.version)}</h1>
  ${e.headline ? `<p class="tagline" style="margin:0 0 6px;text-align:left">${esc(e.headline)}</p>` : ""}
  <p class="date">${fmtDate(e.publishedAt)}${e.prerelease ? " · pre-release" : ""}</p>
  <p style="margin-top:14px"><a class="btn btn-ghost" href="${esc(e.htmlUrl)}">Download ${esc(e.version)} &amp; assets →</a></p>
  <div class="prose">
${e.html}
  </div>
  <p class="pager">${nav}</p>`;

  fs.mkdirSync(path.join(CHANGELOG_OUT, e.version), { recursive: true });
  fs.writeFileSync(
    path.join(CHANGELOG_OUT, e.version, "index.html"),
    layout({
      title: `Vorno ${e.version} — Changelog`,
      description:
        e.summary || `Release notes for Vorno ${e.version}, released ${fmtDate(e.publishedAt)}.`,
      canonical: `https://vorno.ai/changelog/${e.version}/`,
      main,
    }),
  );
}

// --- index -----------------------------------------------------------------

const list = entries
  .map(
    (e) => `  <div class="entry">
    <h2 style="margin:0 0 4px"><a href="/changelog/${e.version}/">v${esc(e.version)}</a></h2>
    <p class="date">${fmtDate(e.publishedAt)}${e.prerelease ? " · pre-release" : ""}</p>
    ${e.headline ? `<p style="margin-top:8px"><strong>${esc(e.headline)}</strong></p>` : ""}
    ${e.summary ? `<p style="margin-top:8px">${esc(e.summary)}</p>` : ""}
    <p style="margin-top:8px"><a href="/changelog/${e.version}/">Full notes</a> · <a href="${esc(e.htmlUrl)}">Download &amp; assets →</a></p>
  </div>`,
  )
  .join("\n");

const indexMain = `  <h1>Changelog</h1>
  <p>Every Vorno release, newest first. Notes are published from the app's own
  release notes at the tag that was built, so this page matches what shipped.
  Binaries live on the <a href="${RELEASES_BASE}">releases page</a>, and the app
  updates itself from that same feed.</p>
${list}
  <h2>Before 0.11.2</h2>
  <p>Vorno is a fork of an open-source project and shares its history up to
  0.11.1; version numbering diverged at 0.11.2, which is the first release built,
  signed, and published as Vorno. There are no Vorno builds below that version,
  so earlier release notes are not reproduced here — they belong to the upstream
  project and are available in
  <a href="https://github.com/Swagatar-LLC/vorno/tree/${TAG}/apps/electron/resources/release-notes">the repository</a>.</p>`;

fs.writeFileSync(
  path.join(CHANGELOG_OUT, "index.html"),
  layout({
    title: "Vorno — Changelog",
    description: "Release notes for every version of Vorno, newest first.",
    canonical: "https://vorno.ai/changelog",
    main: indexMain,
  }),
);

fs.writeFileSync(
  path.join(CHANGELOG_OUT, "BUILD.txt"),
  `Generated by build/build-changelog.mjs from apps/electron/resources/release-notes at ${TAG}.\n` +
    `Do not edit by hand — run \`npm run build\` in vorno-site instead.\n`,
);

log(
  `wrote ${entries.length} versions (${entries.at(-1).version} … ${entries[0].version}) ` +
    `to ${path.relative(ROOT, CHANGELOG_OUT)}`,
);
