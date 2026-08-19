// Upload asset buckets for a Workers assets deploy.
//
// Uses the short-lived, single-purpose upload JWT returned by
// assets-upload-session — NOT the account API token, which never leaves the
// workspace credential store. Everything this script touches lives under
// .content/, which is gitignored.

import fs from "node:fs";
import path from "node:path";
import { CONTENT_DIR } from "./config.mjs";

// Read from the environment, never hardcoded: this repository is public, and
// account IDs do not belong in a tracked file. Export CLOUDFLARE_ACCOUNT_ID
// before running (the value is in the Cloudflare dashboard / the "Vorno Web
// Presence" Notion page).
const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!ACCOUNT) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID is not set — export it before running the REST deploy path.",
  );
}
const DEPLOY = path.join(CONTENT_DIR, "deploy");

const jwt = fs.readFileSync(path.join(DEPLOY, "jwt.txt"), "utf8").trim();
const buckets = JSON.parse(fs.readFileSync(path.join(DEPLOY, "buckets.json"), "utf8"));
const byHash = JSON.parse(fs.readFileSync(path.join(DEPLOY, "by-hash.json"), "utf8"));

const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workers/assets/upload?base64=true`;

let completionJwt = null;
let uploaded = 0;

for (const [i, bucket] of buckets.entries()) {
  const form = new FormData();
  for (const hash of bucket) {
    const entry = byHash[hash];
    if (!entry) throw new Error(`bucket references unknown hash ${hash}`);
    const b64 = fs.readFileSync(entry.abs).toString("base64");
    form.set(hash, new File([b64], hash, { type: entry.contentType }));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(
      `bucket ${i + 1}/${buckets.length} failed: HTTP ${res.status} ` +
        JSON.stringify(body.errors ?? body),
    );
  }
  uploaded += bucket.length;
  console.log(`[upload] bucket ${i + 1}/${buckets.length}: ${bucket.length} assets ok`);
  if (body.result?.jwt) completionJwt = body.result.jwt;
}

if (!completionJwt) {
  throw new Error("all buckets uploaded but no completion JWT was returned");
}

fs.writeFileSync(path.join(DEPLOY, "completion-jwt.txt"), completionJwt);
console.log(`[upload] ${uploaded} assets uploaded; completion token saved`);
