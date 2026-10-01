import assert from "node:assert/strict";
import { ALL_SLUGS, buildSidebar, validateFetchedGuides } from "./docs-manifest.mjs";

// v0.21.x predates Pages; the declared optional entry must not make that
// supported tag fail or produce an unlisted-guide escape hatch.
const beforePages = ALL_SLUGS.filter((slug) => slug !== "pages");
assert.doesNotThrow(() => validateFetchedGuides(beforePages, "v0.21.0"));
assert.doesNotThrow(() => validateFetchedGuides(ALL_SLUGS, "v0.22.0-beta.1"));
assert.throws(
  () => validateFetchedGuides([...beforePages, "unlisted-guide"], "mutation"),
  /not in the manifest: unlisted-guide/,
);
assert.throws(
  () => validateFetchedGuides(beforePages.filter((slug) => slug !== "headroom"), "mutation"),
  /required guides absent.*headroom/,
);
// Decisions first ships in beta.7; older tags must remain buildable.
const beforeDecisions = ALL_SLUGS.filter((slug) => slug !== "decisions");
assert.ok(ALL_SLUGS.includes("decisions"));
assert.doesNotThrow(() => validateFetchedGuides(beforeDecisions, "v0.22.0-beta.6"));
assert.ok(validateFetchedGuides(ALL_SLUGS, "v0.22.0-beta.7").includes("decisions"));
const sidebarSlugs = (available) => buildSidebar({}, available).flatMap((group) => group.items ?? []).map((page) => page.slug);
assert.ok(!sidebarSlugs(beforeDecisions).includes("decisions"));
assert.ok(sidebarSlugs(ALL_SLUGS).includes("decisions"));
console.log("[docs-manifest] positive and mutation cases passed");
