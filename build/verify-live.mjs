// Verify the DEPLOYED site over real HTTP.
//
// build/verify.mjs gates the *output*; this gates the *deployment*. They are
// different failures: a green deploy is not evidence of a correct site
// (LEARNING-048). On 2026-08-17 the v0.17.0 release went green while vorno.ai
// stayed on the previous build — /changelog/0.17.0/ and eighteen new service
// guides 404'd, nothing was red, and only a manual check caught it.
//
// Run after any deploy, in CI or by hand:
//
//   VORNO_TAG=v0.17.0 npm run verify:live
//   VORNO_TAG=v0.17.0 VERIFY_INITIAL_DELAY=0 npm run verify:live   # already settled
//   VORNO_SITE_URL=https://staging.example npm run verify:live
//
// Exit 0 = every check passed. Exit 1 = at least one failed, and every failure
// is printed, not just the first.
//
// ---------------------------------------------------------------------------
// Why this retries instead of asserting once
//
// Newly uploaded Workers assets propagate across Cloudflare PoPs
// asynchronously. Immediately after the v0.17.0 deploy four /docs/sources/*
// routes 404'd while fourteen returned 200, and one route returned 200 and
// then 404 within the same sweep; all eighteen were consistently 200 twenty
// seconds later. A check that asserts the instant the deploy returns produces
// false failures — which is worse than no check at all, because a check that
// cries wolf is a check people learn to ignore.
//
// So: wait, then poll, and only report a failure that survives the whole
// budget. Checks that pass are never re-requested.

import { FOOTER_DISCLAIMER, FOOTER_POWERED, TAG } from "./config.mjs";

const BASE = (process.env.VORNO_SITE_URL || "https://vorno.ai").replace(/\/+$/, "");

/** Version being published, e.g. "0.17.0". Drives the release-specific checks. */
const VERSION = (process.env.VORNO_TAG || TAG).replace(/^v/, "");

const INITIAL_DELAY_MS = Number(process.env.VERIFY_INITIAL_DELAY ?? 30) * 1000;
const ATTEMPTS = Number(process.env.VERIFY_ATTEMPTS ?? 8);
const RETRY_DELAY_MS = Number(process.env.VERIFY_RETRY_DELAY ?? 15) * 1000;

/**
 * Each check is a path plus what must be true of the response.
 *
 * `contains` is the part that matters most: a 200 on /changelog/ says the page
 * exists, not that it lists the version we just shipped. Tonight's failure
 * returned 200 on every index while serving the previous build's content.
 */
const CHECKS = [
  { path: "/", status: 200, contains: [FOOTER_DISCLAIMER] },

  // The docs root, and a nested route. The nested one is deliberate: the
  // subdirectory routes are what flaked during propagation, and they are also
  // what a broken subdirectory build would drop while /docs/ still rendered.
  { path: "/docs/", status: 200, contains: [FOOTER_DISCLAIMER, FOOTER_POWERED] },
  { path: "/docs/sources/", status: 200, contains: [FOOTER_DISCLAIMER] },

  // The changelog index must actually *name* the version being published.
  {
    path: "/changelog/",
    status: 200,
    contains: [VERSION, FOOTER_DISCLAIMER],
    label: `changelog index lists ${VERSION}`,
  },
  {
    path: `/changelog/${VERSION}/`,
    status: 200,
    contains: [VERSION, FOOTER_DISCLAIMER],
    label: `changelog page for ${VERSION}`,
  },

  // The hand-written marketing pages. The publish rebuilds only docs/ and
  // changelog/, but it redeploys the whole assets bundle — so a bad deploy can
  // take these down even though no build step touched them.
  { path: "/download/", status: 200, contains: [FOOTER_DISCLAIMER] },
  { path: "/links/", status: 200, contains: [FOOTER_DISCLAIMER] },
  { path: "/blog/", status: 200, contains: [FOOTER_DISCLAIMER] },

  // A path that must NOT exist. Guards against the opposite failure: a
  // misconfigured not_found_handling that answers 200 to everything would make
  // every check above pass while serving garbage.
  { path: "/this-route-should-not-exist-vorno-verify", status: 404 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function label(check) {
  return check.label ? `${check.path} (${check.label})` : check.path;
}

/** One attempt. Resolves to null on success or a human-readable reason. */
async function run(check) {
  const url = `${BASE}${check.path}`;
  let res;
  try {
    res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "vorno-site-verify", "cache-control": "no-cache" },
    });
  } catch (err) {
    return `request failed: ${err.message}`;
  }

  if (res.status !== check.status) {
    return `expected HTTP ${check.status}, got ${res.status}`;
  }

  if (!check.contains?.length) return null;

  const html = await res.text();
  const missing = check.contains.filter((needle) => !html.includes(needle));
  if (missing.length) {
    return `HTTP ${res.status} but body is missing: ${missing
      .map((m) => JSON.stringify(m.length > 60 ? `${m.slice(0, 57)}...` : m))
      .join(", ")}`;
  }
  return null;
}

console.log(`[verify-live] ${BASE} — expecting version ${VERSION}`);
console.log(`[verify-live] ${CHECKS.length} checks, up to ${ATTEMPTS} attempts`);

if (INITIAL_DELAY_MS > 0) {
  console.log(
    `[verify-live] waiting ${INITIAL_DELAY_MS / 1000}s for edge propagation before the first sweep`,
  );
  await sleep(INITIAL_DELAY_MS);
}

let pending = [...CHECKS];
const reasons = new Map();

for (let attempt = 1; attempt <= ATTEMPTS && pending.length; attempt++) {
  const results = await Promise.all(pending.map(run));

  const stillPending = [];
  for (const [i, reason] of results.entries()) {
    const check = pending[i];
    if (reason === null) {
      console.log(`  ok    ${label(check)}`);
      reasons.delete(check);
    } else {
      reasons.set(check, reason);
      stillPending.push(check);
    }
  }
  pending = stillPending;

  if (!pending.length) break;

  if (attempt < ATTEMPTS) {
    console.log(
      `[verify-live] attempt ${attempt}/${ATTEMPTS}: ${pending.length} not ready ` +
        `(${pending.map((c) => c.path).join(", ")}) — retrying in ${RETRY_DELAY_MS / 1000}s`,
    );
    await sleep(RETRY_DELAY_MS);
  }
}

if (pending.length) {
  console.error(
    `[verify-live] FAILED — ${pending.length}/${CHECKS.length} check(s) never passed:`,
  );
  for (const check of pending) {
    console.error(`  FAIL  ${label(check)} — ${reasons.get(check)}`);
  }
  console.error(
    "[verify-live] the deploy may have reported success while publishing the wrong\n" +
      "              content, or not publishing at all. Do not treat the release as\n" +
      "              complete: check the deploy output, then re-run this.",
  );
  process.exit(1);
}

console.log(`[verify-live] OK — all ${CHECKS.length} checks passed against ${BASE}`);
