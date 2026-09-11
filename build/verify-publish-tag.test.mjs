import assert from "node:assert/strict";
import { isPublishTag } from "./verify-publish-tag.mjs";

for (const tag of ["v0.22.0", "v0.22.0-beta.1", "v1.2.3-rc.0", "v1.2.3-a-b.4"]) {
  assert.equal(isPublishTag(tag), true, `accept ${tag}`);
}
for (const tag of ["0.22.0-beta.1", "v01.2.3", "v1.2", "v1.2.3-01", "v1.2.3+build.1", "v1.2.3-"]) {
  assert.equal(isPublishTag(tag), false, `reject ${tag}`);
}
console.log("[verify-publish-tag] positive and negative cases passed");
