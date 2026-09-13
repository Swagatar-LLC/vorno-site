import assert from "node:assert/strict";
import { ALL_SLUGS, validateFetchedGuides } from "./docs-manifest.mjs";

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
console.log("[docs-manifest] positive and mutation cases passed");
