// Build /docs with Astro Starlight from the guides fetched at the build ref.
//
// The guides are published verbatim. The only transformations applied are
// mechanical and reversible:
//   - inject Starlight frontmatter (title, description) derived from the file
//   - drop the leading `# Title` line, which Starlight renders from frontmatter
//   - rewrite in-repo relative links (`./google.md`) to site routes
// No prose is edited. If a guide reads badly for humans, the fix is framing on
// an authored page, not a diff against the source of truth.
//
// On the link rewrite: these files have two consumers. The bundled copy at
// ~/.vorno-agent/docs/ is read off disk by the agent, where `./google.md` is
// correct and a site route would be meaningless. The published copy needs
// routes. The repo file is the source of truth and the site is a rendering of
// it, so the rendering step is where the transform belongs — the markdown is
// never asked to know it is being published.
//
// Because a link can point at any published page, rewriting has to happen after
// the full set of slugs is known. Hence two passes: collect everything, then
// resolve links against the complete set.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ASTRO_ROOT, DOCS_OUT, DOCS_SRC, REF_LABEL, ROOT, TAG } from "./config.mjs";
import {
  ALL_SLUGS,
  AUTHORED_SLUGS,
  BLURBS,
  GROUPS,
  subdirLabel,
} from "./docs-manifest.mjs";

const AUTHORED_DIR = path.join(ASTRO_ROOT, "pages");
const COLLECTION = path.join(ASTRO_ROOT, "src", "content", "docs");

function log(...args) {
  console.log("[docs]", ...args);
}

function yamlString(s) {
  return JSON.stringify(String(s).replace(/\s+/g, " ").trim());
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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

/** Split a document into fenced-code and prose segments. Only prose is rewritten. */
function splitFences(body) {
  const parts = [];
  const re = /^(```|~~~).*$/gm;
  let pos = 0;
  let open = null;
  let m;
  while ((m = re.exec(body))) {
    if (!open) {
      open = m[1];
      parts.push({ code: false, text: body.slice(pos, m.index) });
      pos = m.index;
    } else if (m[0].startsWith(open)) {
      const end = m.index + m[0].length;
      parts.push({ code: true, text: body.slice(pos, end) });
      pos = end;
      open = null;
    }
  }
  parts.push({ code: Boolean(open), text: body.slice(pos) });
  return parts;
}

/**
 * Rewrite markdown links to `.md` files into site routes.
 *
 * Resolved relative to the *linking page's* directory, so `./google.md` inside
 * `sources/gmail.md` becomes `/docs/sources/google/`, while the same text in a
 * top-level guide would mean `/docs/google/`.
 *
 * A target with no published route (README.md, a guide not shipped at this ref)
 * degrades to plain text. A dead link is worse than no link, and this is the
 * case where the reader is most likely to need the thing that is missing.
 */
function rewriteLinks(body, slug, published, unresolved) {
  const dir = path.posix.dirname(slug);
  const linkRe = /\[([^\]]*)\]\(\s*([^)\s#]+\.md)(#[^)\s]*)?\s*\)/g;

  return splitFences(body)
    .map(({ code, text }) => {
      if (code) return text;
      return text.replace(linkRe, (whole, label, target, hash) => {
        if (/^(https?:|mailto:|\/)/i.test(target)) return whole;
        const resolved = path.posix
          .normalize(path.posix.join(dir === "." ? "" : dir, target))
          .replace(/\.md$/, "");
        if (published.has(resolved)) {
          return `[${label}](/docs/${resolved}/${hash || ""})`;
        }
        unresolved.push({ from: slug, target, label });
        return label;
      });
    })
    .join("");
}

function parse(slug, raw) {
  let body = raw.replace(/^﻿/, "");

  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  const title = h1
    ? h1[1].replace(/`/g, "")
    : slug.replace(/(^|-)(\w)/g, (_, d, c) => (d ? " " : "") + c.toUpperCase());

  // Drop only the leading H1 — Starlight renders the title itself.
  if (h1 && body.slice(0, body.indexOf(h1[0])).trim() === "") {
    body = body.slice(body.indexOf(h1[0]) + h1[0].length).replace(/^\n+/, "");
  }

  return { title, body, description: firstParagraph(body) || BLURBS[slug] || `Vorno ${title}.` };
}

function frontmatter(title, description) {
  return ["---", `title: ${yamlString(title)}`, `description: ${yamlString(description)}`, "---", ""].join("\n");
}

// ---------------------------------------------------------------------------
// Pass 1 — collect every page that will be published
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
  console.warn(`[docs] ! guides not in the manifest, appended ungrouped: ${unlisted.join(", ")}`);
}
if (missing.length) {
  throw new Error(`manifest lists guides absent at ${REF_LABEL}: ${missing.join(", ")}`);
}

const subdirs = fs
  .readdirSync(DOCS_SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

/** slug -> { raw, title, description, authored } */
const pages = new Map();
const titles = {};

for (const slug of [...ALL_SLUGS, ...unlisted]) {
  const raw = fs.readFileSync(path.join(DOCS_SRC, `${slug}.md`), "utf8");
  const p = parse(slug, raw);
  pages.set(slug, { ...p, authored: false });
  titles[slug] = p.title;
}
log(`prepared ${pages.size} guides from ${REF_LABEL}`);

for (const slug of AUTHORED_SLUGS) {
  const src = path.join(AUTHORED_DIR, `${slug}.md`);
  if (!fs.existsSync(src)) {
    throw new Error(`manifest marks "${slug}" authored but ${src} is missing`);
  }
  const raw = fs.readFileSync(src, "utf8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const title = fm?.[1].match(/^title:\s*(.+?)\s*$/m)?.[1];
  if (!title) throw new Error(`authored page ${slug}.md has no frontmatter title`);
  titles[slug] = title.replace(/^["']|["']$/g, "");
  pages.set(slug, { raw, title: titles[slug], authored: true });
}
if (AUTHORED_SLUGS.length) {
  log(`prepared ${AUTHORED_SLUGS.length} authored pages: ${AUTHORED_SLUGS.join(", ")}`);
}

const discovered = {};
for (const dir of subdirs) {
  const all = fs
    .readdirSync(path.join(DOCS_SRC, dir))
    .filter((f) => f.endsWith(".md"))
    .sort();

  // `<dir>/index.md` would take the same route as the top-level `<dir>.md`
  // (`/docs/sources/`), and one would silently shadow the other.
  if (all.some((f) => f.toLowerCase() === "index.md") && ALL_SLUGS.includes(dir)) {
    throw new Error(
      `${dir}/index.md collides with the top-level ${dir}.md — both resolve to ` +
        `/docs/${dir}/. Rename one; the site cannot serve both.`,
    );
  }

  // README.md is repo navigation, not a doc page, and would publish at the
  // graceless /docs/<dir>/readme/. Links to it degrade to plain text.
  const skipped = all.filter((f) => /^readme\.md$/i.test(f));
  if (skipped.length) log(`skipped ${dir}/${skipped.join(", ")} (repo navigation, not a page)`);
  const files = all.filter((f) => !/^readme\.md$/i.test(f));
  if (!files.length) continue;

  const group = [];
  for (const file of files) {
    const slug = `${dir}/${file.replace(/\.md$/, "")}`;
    const raw = fs.readFileSync(path.join(DOCS_SRC, dir, file), "utf8");
    const p = parse(slug, raw);
    pages.set(slug, { ...p, authored: false });
    titles[slug] = p.title;
    group.push({ slug, nav: p.title });
  }
  group.sort((a, b) => a.nav.localeCompare(b.nav));
  discovered[dir] = group;
  log(`discovered ${group.length} guides in ${dir}/`);
}

// ---------------------------------------------------------------------------
// Pass 2 — resolve links against the complete slug set, then write
// ---------------------------------------------------------------------------

const published = new Set([...pages.keys(), "index"]);
const unresolved = [];

fs.rmSync(COLLECTION, { recursive: true, force: true });
fs.mkdirSync(COLLECTION, { recursive: true });

for (const [slug, page] of pages) {
  const dir = path.posix.dirname(slug);
  if (dir !== ".") fs.mkdirSync(path.join(COLLECTION, dir), { recursive: true });

  let out;
  if (page.authored) {
    // Authored pages carry their own frontmatter. A `<!-- DISCOVERED:<dir> -->`
    // marker expands to a link list once those guides exist, and leaves no
    // trace while there are none — so the cross-link never goes stale.
    out = page.raw.replace(/<!--\s*DISCOVERED:([a-z0-9-]+)\s*-->/gi, (_, d) => {
      const group = discovered[d];
      if (!group?.length) return "";
      const links = group.map((p) => `- [${p.nav}](/docs/${p.slug}/)`).join("\n");
      return `## ${subdirLabel(d)}\n\nStep-by-step setup for specific services:\n\n${links}`;
    });
  } else {
    out = frontmatter(page.title, page.description) + rewriteLinks(page.body, slug, published, unresolved);
  }
  fs.writeFileSync(path.join(COLLECTION, `${slug}.md`), out);
}

const rewritten = [...pages.keys()].length;
if (unresolved.length) {
  // Not fatal: a guide may legitimately reference a file that is not a page
  // (README.md). But it must be visible — a link quietly turning into text is
  // still a change to what the reader sees.
  const bySlug = unresolved.reduce((acc, u) => {
    (acc[u.from] ??= []).push(u.target);
    return acc;
  }, {});
  log(`! ${unresolved.length} link(s) had no published route and were rendered as plain text:`);
  for (const [from, targets] of Object.entries(bySlug)) {
    log(`    ${from}: ${[...new Set(targets)].join(", ")}`);
  }
}

// --- landing page -----------------------------------------------------------

const intro = fs.readFileSync(path.join(ASTRO_ROOT, "landing", "index.md"), "utf8");
const cards = GROUPS.map((g) => {
  const items = g.pages
    .map((p) => `  <li><a href="/docs/${p.slug}/">${titles[p.slug]}</a><p>${escapeHtml(p.blurb)}</p></li>`)
    .join("\n");
  return `### ${g.label}\n\n<ul class="vorno-cards">\n${items}\n</ul>`;
}).join("\n\n");

const discoveredSections = Object.entries(discovered)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([dir, group]) => {
    const links = group.map((p) => `[${escapeHtml(p.nav)}](/docs/${p.slug}/)`).join(" · ");
    return `### ${subdirLabel(dir)}\n\nStep-by-step setup for specific services.\n\n${links}`;
  })
  .join("\n\n");

const landingFooter = [
  "",
  "",
  "---",
  "",
  `These guides were published from [\`${REF_LABEL}\`](https://github.com/Swagatar-LLC/vorno/tree/${TAG}/apps/electron/resources/docs).`,
  "See the [changelog](https://vorno.ai/changelog) for what changed in each release.",
  "",
].join("\n");

fs.writeFileSync(
  path.join(COLLECTION, "index.md"),
  intro + cards + (discoveredSections ? `\n\n${discoveredSections}` : "") + landingFooter,
);

fs.writeFileSync(
  path.join(ASTRO_ROOT, "src", "generated-nav.json"),
  JSON.stringify(discovered, null, 2),
);

// ---------------------------------------------------------------------------

execFileSync("npx", ["astro", "build"], {
  cwd: ASTRO_ROOT,
  stdio: "inherit",
  env: { ...process.env, VORNO_TAG: TAG },
});

const dist = path.join(ASTRO_ROOT, "dist");
const built = fs.existsSync(path.join(dist, "docs")) ? path.join(dist, "docs") : dist;

fs.rmSync(DOCS_OUT, { recursive: true, force: true });
fs.cpSync(built, DOCS_OUT, { recursive: true });

fs.writeFileSync(
  path.join(DOCS_OUT, "BUILD.txt"),
  `Generated by build/build-docs.mjs from ${path.relative(ROOT, DOCS_SRC)} at ${REF_LABEL}.\n` +
    `Do not edit by hand — run \`npm run build\` in vorno-site instead.\n`,
);

log(`wrote ${path.relative(ROOT, DOCS_OUT)} (${rewritten} pages)`);
