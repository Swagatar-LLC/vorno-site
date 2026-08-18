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
//   WARN — the same domains appearing as plain text rather than as a link.
//          Naming a host in prose is sometimes correct — /docs/sharing/ has to
//          say where shared sessions are actually stored — so these are
//          reported, and legitimate cases are declared in PROSE_EXCEPTIONS
//          below rather than silently tolerated.

import fs from "node:fs";
import path from "node:path";
import { FOOTER_DISCLAIMER, FOOTER_POWERED, PUBLIC_DIR, ROOT } from "./config.mjs";

// Domains hosting the upstream product's documentation or hosted service.
// (Bare `craft.do` is deliberately absent: `connect.craft.do` appears in
// sources.md as an example of a third-party API you can connect, which is
// exactly as legitimate as the Linear and GitHub examples beside it.)
const UPSTREAM_DOMAINS = ["thecraftagents.com", "agents.craft.do"];

// Declared, reviewed prose mentions. Keyed by `<page>|<domain>`.
const PROSE_EXCEPTIONS = {
  "public/docs/sharing/index.html|agents.craft.do":
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

const pages = walk(PUBLIC_DIR).sort();
const failures = [];
const linkFailures = [];
const warnings = [];
const exceptionsUsed = new Set();

for (const p of pages) {
  const rel = path.relative(ROOT, p);
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
}

console.log(`[verify] scanned ${pages.length} pages under public/`);

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

if (failures.length) {
  console.error("[verify] FAILED — required footer lines missing:");
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}

console.log(
  `[verify] OK — both required footer lines present on all ${pages.length} pages`,
);
