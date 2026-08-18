// Build /docs with Astro Starlight from the guides fetched at TAG.
//
// The guides are published verbatim. The only transformations applied are
// mechanical and reversible:
//   - inject Starlight frontmatter (title, description) derived from the file
//   - drop the leading `# Title` line, which Starlight renders from frontmatter
//   - rewrite in-repo relative links (`./vorno-cli.md`) to site routes
// No prose is edited. If a guide reads badly for humans, the fix is framing on
// the landing page, not a diff against the source of truth.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  ASTRO_ROOT,
  DOCS_OUT,
  DOCS_SRC,
  ROOT,
  TAG,
} from "./config.mjs";
import { ALL_SLUGS, BLURBS, GROUPS } from "./docs-manifest.mjs";

const COLLECTION = path.join(ASTRO_ROOT, "src", "content", "docs");

function log(...args) {
  console.log("[docs]", ...args);
}

function yamlString(s) {
  return JSON.stringify(String(s).replace(/\s+/g, " ").trim());
}

/** First real paragraph, flattened — used as the page description. */
function firstParagraph(body) {
  const lines = body.split("\n");
  const buf = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (/^(#|>|[-*+]\s|\d+\.\s|```|\||:::)/.test(t)) {
      if (buf.length) break;
      continue;
    }
    buf.push(t);
  }
  const text = buf
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`]/g, "")
    .trim();
  return text.length > 240 ? `${text.slice(0, 237).trimEnd()}…` : text;
}

function transform(slug, raw) {
  let body = raw.replace(/^﻿/, "");

  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  const title = h1
    ? h1[1].replace(/`/g, "")
    : slug.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());

  // Drop only the leading H1 — Starlight renders the title itself.
  if (h1 && body.slice(0, body.indexOf(h1[0])).trim() === "") {
    body = body.slice(body.indexOf(h1[0]) + h1[0].length).replace(/^\n+/, "");
  }

  const description = firstParagraph(body) || BLURBS[slug] || `Vorno ${title}.`;

  // `./vorno-cli.md` and `./statuses.md#color-format` are repo-relative; on the
  // site they are sibling routes.
  body = body.replace(
    /\]\(\.\/([a-z0-9-]+)\.md(#[^)]*)?\)/g,
    (m, target, hash) =>
      ALL_SLUGS.includes(target) ? `](/docs/${target}/${hash || ""})` : m,
  );

  const frontmatter = [
    "---",
    `title: ${yamlString(title)}`,
    `description: ${yamlString(description)}`,
    "---",
    "",
  ].join("\n");

  return { title, out: frontmatter + body };
}

function buildLanding() {
  const intro = fs.readFileSync(
    path.join(ASTRO_ROOT, "landing", "index.md"),
    "utf8",
  );
  const cards = GROUPS.map((g) => {
    const items = g.pages
      .map(
        (p) =>
          `  <li><a href="/docs/${p.slug}/">${titles[p.slug]}</a><p>${escapeHtml(
            p.blurb,
          )}</p></li>`,
      )
      .join("\n");
    return `### ${g.label}\n\n<ul class="vorno-cards">\n${items}\n</ul>`;
  }).join("\n\n");

  const footer = [
    "",
    "",
    "---",
    "",
    `These guides were published from [\`${TAG}\`](https://github.com/Swagatar-LLC/vorno/tree/${TAG}/apps/electron/resources/docs).`,
    "See the [changelog](https://vorno.ai/changelog) for what changed in each release.",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(COLLECTION, "index.md"), intro + cards + footer);
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------

if (!fs.existsSync(DOCS_SRC)) {
  throw new Error(`missing ${DOCS_SRC} — run \`npm run fetch\` first`);
}

const available = fs
  .readdirSync(DOCS_SRC)
  .filter((f) => f.endsWith(".md"))
  .map((f) => f.replace(/\.md$/, ""));

const unlisted = available.filter((s) => !ALL_SLUGS.includes(s));
const missing = ALL_SLUGS.filter((s) => !available.includes(s));
if (unlisted.length) {
  // A new guide shipped and nobody added it to the manifest — publishing it
  // unsorted is better than dropping it silently.
  console.warn(`[docs] ! guides not in the manifest, appended ungrouped: ${unlisted.join(", ")}`);
}
if (missing.length) {
  throw new Error(`manifest lists guides absent at ${TAG}: ${missing.join(", ")}`);
}

fs.rmSync(COLLECTION, { recursive: true, force: true });
fs.mkdirSync(COLLECTION, { recursive: true });

const titles = {};
for (const slug of [...ALL_SLUGS, ...unlisted]) {
  const raw = fs.readFileSync(path.join(DOCS_SRC, `${slug}.md`), "utf8");
  const { title, out } = transform(slug, raw);
  titles[slug] = title;
  fs.writeFileSync(path.join(COLLECTION, `${slug}.md`), out);
}
log(`prepared ${Object.keys(titles).length} guides from ${TAG}`);

buildLanding();

execFileSync("npx", ["astro", "build"], {
  cwd: ASTRO_ROOT,
  stdio: "inherit",
  env: { ...process.env, VORNO_TAG: TAG },
});

// Astro nests output under `base` when it is set.
const dist = path.join(ASTRO_ROOT, "dist");
const built = fs.existsSync(path.join(dist, "docs")) ? path.join(dist, "docs") : dist;

fs.rmSync(DOCS_OUT, { recursive: true, force: true });
fs.cpSync(built, DOCS_OUT, { recursive: true });

// Anything Astro emitted outside the base path (e.g. a root-level 404) would
// collide with the hand-written marketing site; don't copy it.
const strays = fs
  .readdirSync(dist)
  .filter((f) => f !== "docs" && built !== dist);
if (strays.length) log(`ignored non-/docs build output: ${strays.join(", ")}`);

fs.writeFileSync(
  path.join(DOCS_OUT, "BUILD.txt"),
  `Generated by build/build-docs.mjs from ${path.relative(ROOT, DOCS_SRC)} at ${TAG}.\n` +
    `Do not edit by hand — run \`npm run build\` in vorno-site instead.\n`,
);

log(`wrote ${path.relative(ROOT, DOCS_OUT)}`);
