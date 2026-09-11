// Strict release-tag guard shared by local checks and publish.yml.
// SemVer build metadata is deliberately not accepted: the publishing contract
// permits an optional prerelease suffix only.
const PRERELEASE_IDENTIFIER = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)";

export const PUBLISH_TAG = new RegExp(
  "^v(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)" +
    `(?:-${PRERELEASE_IDENTIFIER}(?:\\.${PRERELEASE_IDENTIFIER})*)?$`,
);

export function isPublishTag(tag) {
  return typeof tag === "string" && PUBLISH_TAG.test(tag);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const [tag] = process.argv.slice(2);
  if (process.argv.length !== 3 || !isPublishTag(tag)) {
    console.error(`Refusing tag '${tag ?? ""}' — expected v1.2.3 or v1.2.3-prerelease.`);
    process.exit(1);
  }
  console.log(`Accepted publish tag ${tag}`);
}
