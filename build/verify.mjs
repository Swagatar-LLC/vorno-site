// Post-build gate over everything in public/.
//
// Two classes of check:
//   FAIL — the required footer lines are missing from a page. Trademark
//          clearance for "Vorno" is in flight, so the non-affiliation line is
//          legally load-bearing; a generated page that drops it is a defect,
//          not a cosmetic issue. This is the check that makes the guardrail
//          real on generated pages rather than only on the templates.
//   WARN — a published page points readers at the upstream project's domains.
//          Reported, never silently rewritten: /docs republishes the shipped
//          guides verbatim, so a bad link here is a bug to fix in the vorno
//          repo (PLAN-034 Lane D), not on the site.

import fs from "node:fs";
import path from "node:path";
import { FOOTER_DISCLAIMER, FOOTER_POWERED, PUBLIC_DIR, ROOT } from "./config.mjs";

// Domains that host the upstream product's own documentation/service. A link
// to one of these from a vorno.ai page points our readers at another product.
// (Bare `craft.do` is deliberately absent: `connect.craft.do` appears in
// sources.md as an example of a third-party API you can connect, which is
// exactly as legitimate as the Linear and GitHub examples beside it.)
const UPSTREAM_DOMAINS = [/thecraftagents\.com/gi, /agents\.craft\.do/gi];

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
const warnings = [];

for (const p of pages) {
  const rel = path.relative(ROOT, p);
  const html = fs.readFileSync(p, "utf8");

  for (const line of [FOOTER_DISCLAIMER, FOOTER_POWERED]) {
    if (!html.includes(line)) failures.push(`${rel}: missing footer line "${line}"`);
  }

  for (const re of UPSTREAM_DOMAINS) {
    const hits = html.match(re);
    if (hits) warnings.push(`${rel}: ${hits.length}× ${hits[0].toLowerCase()}`);
  }
}

console.log(`[verify] scanned ${pages.length} pages under public/`);

if (warnings.length) {
  console.log("[verify] upstream documentation/service domains in published pages:");
  for (const w of warnings) console.log(`  WARN  ${w}`);
  console.log(
    "[verify] /docs republishes the shipped guides verbatim, so these are fixed at\n" +
      "         the source in Swagatar-LLC/vorno (PLAN-034 Lane D), never here.",
  );
} else {
  console.log("[verify] OK — no upstream documentation/service domains linked");
}

if (failures.length) {
  console.error("[verify] FAILED — required footer lines missing:");
  for (const f of failures) console.error(`  FAIL  ${f}`);
  process.exit(1);
}

console.log(
  `[verify] OK — both required footer lines present on all ${pages.length} pages`,
);
