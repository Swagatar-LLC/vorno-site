// @ts-check
import fs from "node:fs";
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { buildSidebar } from "../build/docs-manifest.mjs";

const TAG = process.env.VORNO_TAG || "v0.16.0";

// Written by build/build-docs.mjs immediately before `astro build`, listing the
// guides it found in subdirectories of the fetched docs (see docs-manifest.mjs).
// Absent on a bare `astro build`, which is fine — the curated groups still render.
const discovered = fs.existsSync(new URL("./src/generated-nav.json", import.meta.url))
  ? JSON.parse(fs.readFileSync(new URL("./src/generated-nav.json", import.meta.url), "utf8"))
  : {};

// Served from the existing vorno.ai Worker at /docs — not a separate host
// (ADR-0023). `base` must match, or every internal link 404s.
export default defineConfig({
  site: "https://vorno.ai",
  base: "/docs",
  trailingSlash: "always",
  build: { format: "directory" },
  integrations: [
    starlight({
      title: "Vorno Docs",
      description:
        "Documentation for Vorno — a macOS desktop app for working with AI agents across your real data.",
      logo: { src: "./src/assets/logo-mark.svg", alt: "Vorno" },
      favicon: "/favicon.svg",
      customCss: ["./src/styles/vorno.css"],
      components: {
        // The trademark non-affiliation line and the "Powered by Claude" line
        // are required verbatim on every page (vorno-site README guardrail).
        Footer: "./src/components/Footer.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/Swagatar-LLC/vorno",
        },
      ],
      // The guides are fetched from the vorno repo at a tag; there is nothing
      // editable at this path, so Starlight's "Edit page" link is off.
      editLink: {},
      lastUpdated: false,
      pagination: true,
      sidebar: buildSidebar(discovered),
      head: [
        {
          tag: "meta",
          attrs: { name: "vorno:docs-version", content: TAG },
        },
      ],
      credits: false,
    }),
  ],
});
