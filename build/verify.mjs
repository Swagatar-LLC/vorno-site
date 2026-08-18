// Post-build gate over everything in public/.
//
// Three checks, in descending severity:
//
//   FAIL — a required footer line is missing from a page. Trademark clearance
//          for "Vorno" is in flight, so the non-affiliation line is legally
//          load-bearing; a generated page that drops it is a defect, not a
//          cosmetic issue. This is what makes the guardrail real on generated
//          pages rather than only on the templates.
//
//   FAIL — a page contains a navigable link (href/src) to an upstream
//          documentation or service domain. That sends our readers to another
//          product from our own docs. It is a hard failure because /docs
//          republishes the shipped guides verbatim: the fix belongs in
//          Swagatar-LLC/vorno (PLAN-034 Lane D), and blocking the publish is
//          the point. ALLOW_UPSTREAM_LINKS=1 overrides if a publish must go
//          out ahead of the source fix.
//
//   FAIL — an internal link points at a page that was not built. Added after a
//          preview build shipped 36 dead `.md` hrefs that every other check
//          reported as clean: the guides are written for a filesystem, so a
//          link the build fails to rewrite stays valid on disk and 404s on the
//          site. The most load-bearing links are the likeliest to break this
//          way, because prerequisites are what guides link to.
//
//   WARN — the same domains appearing as plain text rather than as a link.
//          Naming a host in prose is sometimes correct — /docs/sharing/ has to
//          say where shared sessions are actually stored — so these are
//          reported, and legitimate cases are declared in PROSE_EXCEPTIONS
//          below rather than silently tolerated.

import fs from "node:fs";
import path from "node:path";
import { FOOTER_DISCLAIMER, FOOTER_POWERED, IS_PREVIEW, PUBLIC_DIR, REF_LABEL } from "./config.mjs";

// Domains hosting the upstream product's documentation or hosted service.
// (Bare `craft.do` is deliberately absent: `connect.craft.do` appears in
// sources.md as an example of a third-party API you can connect, which is
// exactly as legitimate as the Linear and GitHub examples beside it.)
const UPSTREAM_DOMAINS = ["thecraftagents.com", "agents.craft.do"];

// Declared, reviewed prose mentions. Keyed by `<page>|<domain>`.
const PROSE_EXCEPTIONS = {
  "docs/sharing/index.html|agents.craft.do":
    "Session sharing genuinely uploads to this host; the page exists to disclose that. " +
    "Named as text, not linked.",
};

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** Does an absolute site path resolve to something actually built? */
function resolves(sitePath) {
  const clean = decodeURIComponent(sitePath.split("#")[0].split("?")[0]);
  if (clean === "/") return fs.existsSync(path.join(PUBLIC_DIR, "index.html"));
  const target = path.join(PUBLIC_DIR, clean);
  if (fs.existsSync(target)) {
    return fs.statSync(target).isDirectory()
      ? fs.existsSync(path.join(target, "index.html"))
      : true;
  }
  // The assets pipeline serves /foo from /foo/index.html (auto-trailing-slash).
  return fs.existsSync(`${target}.html`) || fs.existsSync(path.join(target, "index.html"));
}

const pages = walk(PUBLIC_DIR).sort();
const failures = [];
const linkFailures = [];
const deadLinks = [];
const warnings = [];
const exceptionsUsed = new Set();

for (const p of pages) {
  // Relative to the output root, not the repo root: a preview build writes to
  // .preview/public, and an exception must not silently stop matching there.
  const rel = path.relative(PUBLIC_DIR, p);
  const html = fs.readFileSync(p, "utf8");

  for (const line of [FOOTER_DISCLAIMER, FOOTER_POWERED]) {
    if (!html.includes(line)) failures.push(`${rel}: missing footer line "${line}"`);
  }

  for (const domain of UPSTREAM_DOMAINS) {
    const all = html.match(new RegExp(domain.replace(/\./g, "\\."), "gi")) ?? [];
    if (!all.length) continue;

    const linked =
      html.match(
        new RegExp(`(?:href|src)\\s*=\\s*["'][^"']*${domain.replace(/\./g, "\\.")}`, "gi"),
      ) ?? [];

    if (linked.length) {
      linkFailures.push(`${rel}: ${linked.length}× link to ${domain}`);
    }

    const proseCount = all.length - linked.length;
    if (proseCount > 0) {
      const key = `${rel}|${domain}`;
      if (PROSE_EXCEPTIONS[key]) exceptionsUsed.add(key);
      else warnings.push(`${rel}: ${proseCount}× ${domain} (as text)`);
    }
  }

  // Internal link integrity. Only site-absolute hrefs are checked: relative
  // ones are resolved by the browser against a route we already validated, and
  // external ones would make the build depend on the network.
  for (const m of html.matchAll(/href\s*=\s*"(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith("//")) continue; // protocol-relative, external
    if (!resolves(href)) deadLinks.push(`${rel} -> ${href}`);
  }
}

console.log(
  `[verify] scanned ${pages.length} pages of ${REF_LABEL}` +
    (IS_PREVIEW ? " (preview)" : ""),
);

for (const key of Object.keys(PROSE_EXCEPTIONS)) {
  if (!exceptionsUsed.has(key)) {
    // A stale exception is a small thing, but it is also how an allowlist
    // quietly stops describing reality.
    console.log(`[verify] note: unused prose exception — ${key}`);
  }
}
for (const key of exceptionsUsed) {
  console.log(`[verify] allowed (declared): ${key} — ${PROSE_EXCEPTIONS[key]}`);
}

if (warnings.length) {
  console.log("[verify] undeclared upstream-domain mentions:");
  for (const w of warnings) console.log(`  WARN  ${w}`);
}

if (linkFailures.length && !process.env.ALLOW_UPSTREAM_LINKS) {
  console.error("[verify] FAILED — published pages link to upstream domains:");
  for (const f of linkFailures) console.error(`  FAIL  ${f}`);
  console.error(
    "[verify] /docs republishes the shipped guides verbatim — fix this at the source\n" +
      "         in Swagatar-LLC/vorno (PLAN-034 Lane D), not here.\n" +
      "         ALLOW_UPSTREAM_LINKS=1 publishes anyway.",
  );
  process.exit(1);
}
if (linkFailures.length) {
  for (const f of linkFailures) console.log(`  WARN (overridden)  ${f}`);
}
if (!linkFailures.length) {
  console.log("[verify] OK — no page links to an upstream documentation/service domain");
}

if (deadLinks.length) {
  console.error(`[verify] FAILED — ${deadLinks.length} internal link(s) point at unbuilt pages:`);
  for (const d of deadLinks.slice(0, 40)) console.error(`  FAIL  ${d}`);
  if (deadLinks.length > 40) console.error(`  ... and ${deadLinks.length - 40} more`);
  console.error(
    "[verify] a `.md` link the build did not rewrite stays valid on disk and 404s\n" +
      "         on the site — check build-docs.mjs rewriteLinks().",
  );
  process.exit(1);
}
console.log(`[verify] OK — every internal link resolves to a built page`);

if (failures.length) {
  console.error("[verify] FAILED — required footer lines missing:");
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}

console.log(
  `[verify] OK — both required footer lines present on all ${pages.length} pages`,
);
