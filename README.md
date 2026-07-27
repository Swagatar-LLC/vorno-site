# vorno-site

Source for **[vorno.ai](https://vorno.ai)** — the Vorno marketing/landing site, deployed as a **Cloudflare Worker with static assets** (free tier) on the Swagatar LLC Cloudflare account (`c3e447a3c0a726801eeb9a1148ff09de`), Worker name `vorno-site`, custom domains `vorno.ai` + `www.vorno.ai` (zone `2725363d3a92fd613c937ec791ffab9a`).

## Layout

- `public/` — static assets served by the Workers assets pipeline
  - `/` landing, `/download` fallback, `/links` link-in-bio hub, `/blog` + `/changelog` scaffolds, `404.html`
  - `assets/logo-mark.svg` — the vortex-"V" mark, copied verbatim from `craft-agents-oss/apps/electron/src/renderer/assets/logo_mark.svg` (do not fork the design; re-copy on change)
- `worker/index.js` — edge logic: `www` → apex 301, OS-aware `/download` (macOS UA → 302 to the latest `.dmg` from the `Swagatar-LLC/vorno-releases` GitHub releases API, edge-cached 5 min; everyone else falls through to the static asset listing page)
- `wrangler.jsonc` — config; `run_worker_first: true` so the Worker sees every request before assets

## Deploy

```bash
bunx wrangler deploy   # needs CLOUDFLARE_API_TOKEN or `wrangler login`
```

The initial deploy (2026-07-26) was performed via the raw Cloudflare REST API (assets-upload-session → asset upload → script PUT → custom-domain PUTs) using the workspace `cloudflare` source token.

## Guardrails

Every page footer must keep, verbatim:

> Vorno is not affiliated with or endorsed by Craft Docs Ltd.

and the "Powered by Claude" line (framing only — never Claude-Code-mimicking). Visual identity derives from the existing vortex-"V" mark; do not invent a new mark. See the "Vorno Web Presence" Notion page (IT & Technical Operations) for the full domain/DNS/email configuration record.
