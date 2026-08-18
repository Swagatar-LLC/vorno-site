# vorno-site

Source for **[vorno.ai](https://vorno.ai)** — the Vorno marketing site, public documentation, and changelog, deployed as a **Cloudflare Worker with static assets** (free tier) on the Swagatar LLC Cloudflare account (`c3e447a3c0a726801eeb9a1148ff09de`), Worker name `vorno-site`, custom domains `vorno.ai` + `www.vorno.ai` (zone `2725363d3a92fd613c937ec791ffab9a`).

## Layout

- `public/` — everything the Workers assets pipeline serves. Both hand-written and generated pages live here, and **the generated output is committed**, so a bare `bunx wrangler deploy` from a clean clone always publishes a complete site.
  - **Hand-written:** `/` landing, `/download` fallback, `/links` link-in-bio hub, `/blog`, `404.html`, `assets/`
  - **Generated — do not edit:** `docs/` (Astro Starlight), `changelog/` (index + a page per version). Each has a `BUILD.txt` saying so.
  - `assets/logo-mark.svg` — the vortex-"V" mark, copied verbatim from `craft-agents-oss/apps/electron/src/renderer/assets/logo_mark.svg` (do not fork the design; re-copy on change). `docs-src/src/assets/logo-mark.svg` is the same file for the Starlight header.
- `worker/index.js` — edge logic: `www` → apex 301, OS-aware `/download` (macOS UA → 302 to the latest `.dmg` from the `Swagatar-LLC/vorno-releases` GitHub releases API, edge-cached 5 min; everyone else falls through to the static asset listing page)
- `wrangler.jsonc` — config; `run_worker_first: true` so the Worker sees every request before assets
- `build/` — the content pipeline (see below)
- `docs-src/` — the Astro Starlight project. Its `src/content/docs/` is **fetched content, gitignored**; only the config, brand CSS, footer override, and `landing/index.md` are source.

## Build

Docs and changelog are generated from content in the **public `Swagatar-LLC/vorno` repo at a git tag**, so what vorno.ai serves is exactly what shipped in that build ([ADR-0023](https://github.com/Swagatar-LLC/vorno/blob/main/roadmap/decisions/0023-vorno-owns-its-documentation-endpoint.md)).

```bash
npm install
npm run build              # defaults to the tag in build/config.mjs
VORNO_TAG=v0.17.0 npm run build
```

`npm run build` runs four steps, each also runnable alone:

| Step | Script | What it does |
|---|---|---|
| `fetch` | `build/fetch-content.mjs` | Streams the repo tarball at `VORNO_TAG`, extracting only `apps/electron/resources/{docs,release-notes}`. Pulls the release feed. Backfills release notes for shipped versions whose notes file no longer exists at the tag (`0.11.4` is the known case). |
| `docs` | `build/build-docs.mjs` | Stages the guides into the Starlight collection and runs `astro build` → `public/docs/`. |
| `changelog` | `build/build-changelog.mjs` | Renders `public/changelog/` — index + a page per version. |
| `verify` | `build/verify.mjs` | Gates the output. See below. |

**The guides are published verbatim.** The only transformations are mechanical: inject Starlight frontmatter, drop the duplicated leading `# Title`, and rewrite in-repo relative links (`./vorno-cli.md`) to site routes. If a guide reads badly for a human, add framing to `docs-src/landing/index.md` — never diff against the source of truth, which is what the shipped app actually loads.

Ordering, sidebar labels, and landing-page blurbs live in `build/docs-manifest.mjs`. A guide present at the tag but missing from the manifest is published ungrouped with a warning; a manifest entry missing at the tag fails the build.

`/changelog` covers Vorno's own release line only (**≥ 0.11.2**). Versions at or below 0.11.1 are shared history with the upstream project: the release feed has no Vorno build for any of them, and their notes describe a differently-named product, so republishing them here would be both unusable and an affiliation claim the footer explicitly disclaims. The index links out instead.

## Deploy

```bash
bunx wrangler deploy   # needs CLOUDFLARE_API_TOKEN or `wrangler login`
```

Deploying does not build. Run `npm run build` first when the content should change; otherwise `wrangler deploy` publishes whatever is committed under `public/`.

The initial deploy (2026-07-26) was performed via the raw Cloudflare REST API (assets-upload-session → asset upload → script PUT → custom-domain PUTs) using the workspace `cloudflare` source token.

If a Cloudflare call ever returns `403 code 9109, "Cannot use the access token from location: <ip>"`, the token has an IP allowlist that no longer matches this machine. That blocked a deploy on 2026-08-17 and the restriction was relaxed the same evening, so it should not recur — but the symptom is worth recognising, because the API client egresses over IPv6 whose privacy address rotates, so any allowlist pinned to a v6 address goes stale on its own without anyone changing anything.

### Deploying without wrangler credentials

`build/deploy-manifest.mjs` and `build/deploy-upload.mjs` exist for the case where the token is reachable through the workspace `cloudflare` source but `wrangler` itself is unauthenticated (`wrangler whoami` → not authenticated) — the source holds the token and never exposes it to the shell. They reproduce wrangler's own upload protocol:

1. `node build/deploy-manifest.mjs` — hashes every file under `public/` the way wrangler does (`blake3(base64(contents) + extensionWithoutDot).hex().slice(0, 32)`) and writes `.content/deploy/manifest.json`.
2. `POST accounts/:id/workers/scripts/vorno-site/assets-upload-session` with that manifest → returns an upload JWT and hash buckets. Save them to `.content/deploy/jwt.txt` and `buckets.json`.
3. `node build/deploy-upload.mjs` — uploads each bucket using the **short-lived upload JWT**, not the account token, and saves the completion token.
4. `PUT accounts/:id/workers/scripts/vorno-site` — multipart body with a `metadata` part (`main_module`, `compatibility_date`, the `ASSETS` binding, and `assets.jwt` = the completion token, plus the `html_handling` / `not_found_handling` / `run_worker_first` config that mirrors `wrangler.jsonc`) and the worker module.

`.content/` is gitignored, so no token is ever written to a tracked file. **`bunx wrangler deploy` remains the normal path** — this is the fallback, and if the two ever disagree, `wrangler.jsonc` is the source of truth.

### Publishing on release (CI)

`.github/workflows/publish.yml` rebuilds `/docs` + `/changelog` at a release tag and deploys. It exists because v0.17.0 shipped while this site stayed on the previous build: `/changelog/0.17.0/` and eighteen new guides 404'd, **nothing was red**, and a human had to notice. ADR-0023 made documentation a release artifact; this is what makes that true without anyone remembering.

Two triggers:

| Trigger | Source |
|---|---|
| `repository_dispatch` (`vorno-release`) | the `Release` workflow in `Swagatar-LLC/vorno`, after a **signed, published** release |
| `workflow_dispatch` | a human, for any tag — with a `deploy` checkbox for a build-only dry run |

The manual trigger is not a convenience afterthought: it makes the pipeline runnable and testable without cutting a release, and it is the same code path CI takes.

The job builds → deploys → commits the rebuilt `public/` back → verifies over HTTP. The commit lands **after** the deploy on purpose, so this repo records what actually reached the edge rather than what was hoped for; committing first would let a failed deploy leave the repo claiming to be live.

**Required secret — `CLOUDFLARE_API_TOKEN` on this repository** (Settings → Secrets and variables → Actions). Scope it to *Workers Scripts: Edit* on account `c3e447a3c0a726801eeb9a1148ff09de`.

Mint a **separate token from the workspace `cloudflare` source token**, on least-privilege grounds: this one needs exactly one permission on one account, it lives in a shared CI system rather than a local credential store, and either can then be revoked or rotated without breaking the other. Reusing the interactive token would put a broadly-scoped credential in CI and couple two unrelated blast radii.

Without that secret the workflow still runs, still builds, and still gates the output — it warns and skips the deploy instead of failing, so the build leg stays exercisable. Publish by hand in the meantime:

```bash
VORNO_TAG=v0.17.0 npm run build
npx wrangler deploy
VORNO_TAG=v0.17.0 npm run verify:live
```

### After every deploy, verify over real HTTP

`npm run verify:live` is the scripted form of the sweep below, and is what CI runs. It checks the marketing pages, `/docs/` and a nested docs route, that `/changelog/` **names** the version being published, that `/changelog/<version>/` exists, and that an unknown path still 404s (a catch-all 200 would make every other check meaningless). It waits for edge propagation and re-polls before reporting anything.

```bash
VORNO_TAG=v0.17.0 npm run verify:live                        # after a deploy
VORNO_TAG=v0.17.0 VERIFY_INITIAL_DELAY=0 npm run verify:live # already settled
```

The manual equivalent:

A green deploy is not evidence of a correct site (the failure shape of LEARNING-048). The shell's `curl` is aliased to a missing binary — use `/usr/bin/curl`.

```bash
for p in / /docs/ /docs/sources/ /changelog /changelog/0.16.0/ /download /links /blog; do
  printf '%-24s %s\n' "$p" "$(/usr/bin/curl -sL -o /dev/null -w '%{http_code}' "https://vorno.ai$p")"
done
/usr/bin/curl -sI -A 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' https://vorno.ai/download | head -3
```

`/docs`, `/changelog`, `/download`, `/links`, and `/blog` each 307 to their trailing-slash form (the assets pipeline's `auto-trailing-slash`), so check with `-L` or request the trailing-slash URL.

**Wait ~30s before verifying, and re-check any 404 before believing it.** Newly uploaded assets propagate across Cloudflare PoPs asynchronously: immediately after the v0.17.0 deploy, four `/docs/sources/*` routes 404'd while fourteen returned 200, and one route returned 200 and then 404 within the same sweep. All eighteen were consistently 200 twenty seconds later. A verification script that runs the instant the deploy returns will produce false failures — which is worse than no check, because it trains you to ignore it.

**Cloudflare gotcha:** Redirect Rules run **before** Workers and silently shadow them. Never add one to these zones. If a path mysteriously bypasses the Worker, check that first and purge the zone cache after deleting the rule.

## Guardrails

Every page footer must keep, verbatim:

> Vorno is not affiliated with or endorsed by Craft Docs Ltd.

and the "Powered by Claude" line (framing only — never Claude-Code-mimicking). Trademark clearance for "Vorno" is in flight, so the non-affiliation line is legally load-bearing.

`npm run verify` **fails the build** if either line is missing from any `.html` under `public/` — templates and generated pages alike. Hand-written pages carry it inline; `/changelog` gets it from `build/layout.mjs`; `/docs` gets it from the Starlight `Footer` component override in `docs-src/src/components/Footer.astro`.

The same step **warns** when a published page links to an upstream documentation or service domain (`thecraftagents.com`, `agents.craft.do`). Those are fixed at the source in `Swagatar-LLC/vorno`, never patched here — `/docs` republishes what shipped. (Bare `craft.do` is not flagged: `connect.craft.do` appears in the sources guide as an example third-party API, as legitimate as the Linear and GitHub examples beside it.)

Visual identity derives from the existing vortex-"V" mark; do not invent a new mark. `/docs` is branded through CSS variables in `docs-src/src/styles/vorno.css`, lifted from `public/assets/style.css`. See the "Vorno Web Presence" Notion page (IT & Technical Operations) for the full domain/DNS/email configuration record.
