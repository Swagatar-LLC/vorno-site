// Ordering and grouping for /docs.
//
// The source guides in `apps/electron/resources/docs/*.md` are a flat directory
// with no ordering metadata — they are loaded into agent system prompts, where
// order is irrelevant. A human reading a docs site needs a spine, so the
// grouping lives here rather than in the guides. The guides themselves are
// published verbatim; nothing in this file edits their content.
//
// `nav` is the sidebar label. The guides' own titles ("Sources Configuration
// Guide", "Mermaid Diagram Syntax Reference") are correct but repetitive in a
// list; the page title itself is left exactly as written.
// `blurb` is used for the /docs landing page cards only.
//
// `authored: true` marks a page written for this site rather than fetched from
// the repo — human framing that sits *in front of* an agent-facing guide
// without editing it. Its source is `docs-src/pages/<slug>.md`. Every claim on
// an authored page has to stay true at every release, which is why there are
// deliberately only two.

export const GROUPS = [
  {
    label: "Connect your data",
    pages: [
      {
        slug: "connecting-data",
        nav: "Connecting a data source",
        authored: true,
        blurb:
          "Start here: what a source actually is, what happens when you ask for one, and what you are agreeing to when you connect it.",
      },
      {
        slug: "sources",
        nav: "Sources",
        blurb:
          "MCP servers, REST APIs, and local folders — how a source is configured, authenticated, and documented for the agent.",
      },
      {
        slug: "browser-tools",
        nav: "Browser tools",
        blurb:
          "Drive the built-in browser: snapshots, clicks, form fill, downloads, and the console/network inspectors.",
      },
      {
        slug: "llm-tool",
        nav: "LLM tool",
        blurb:
          "Fan a focused subtask out to a second model with `call_llm` — batch extraction, classification, structured output.",
      },
    ],
  },
  {
    label: "Shape the workspace",
    pages: [
      {
        slug: "skills",
        nav: "Skills",
        blurb: "Reusable instruction sets that teach the agent a specialized behavior.",
      },
      {
        slug: "permissions",
        nav: "Permissions",
        blurb:
          "Explore, Ask to Edit, and Execute — what each mode allows and how to customize the rules.",
      },
      {
        slug: "statuses",
        nav: "Statuses",
        blurb: "Workflow states for sessions, including which ones count as closed.",
      },
      {
        slug: "labels",
        nav: "Labels",
        blurb: "Boolean and valued labels for tagging sessions and driving automations.",
      },
      {
        slug: "sharing",
        nav: "Sharing a session",
        authored: true,
        blurb:
          "What publishing a session exposes, where the copy is stored and who operates it, and how to revoke it.",
      },
      { slug: "themes",
        nav: "Themes", blurb: "The six-color theme system, app-wide and per-workspace." },
      { slug: "tool-icons",
        nav: "Tool icons", blurb: "Map tool names to icons in the session timeline." },
    ],
  },
  {
    label: "Automate",
    pages: [
      {
        slug: "automations",
        nav: "Automations",
        blurb:
          "Event-driven rules: triggers, actions, webhooks, variables, loop guards, and worked examples.",
      },
    ],
  },
  {
    label: "Render output",
    pages: [
      {
        slug: "rendering",
        nav: "What Vorno can render",
        authored: true,
        blurb:
          "Overview: the six output formats Vorno renders inline, and which one fits what you are trying to show.",
      },
      { slug: "data-tables",
        nav: "Data tables", blurb: "Sortable tables and spreadsheets, including file-backed rows." },
      { slug: "mermaid",
        nav: "Mermaid diagrams", blurb: "Diagram syntax reference for natively rendered Mermaid charts." },
      { slug: "html-preview",
        nav: "HTML preview", blurb: "Render HTML — emails, reports, styled documents — inline." },
      { slug: "markdown-preview",
        nav: "Markdown preview", blurb: "Render a markdown file inline instead of dumping its source." },
      { slug: "pdf-preview",
        nav: "PDF preview", blurb: "Show PDFs inline with multi-page navigation." },
      { slug: "image-preview",
        nav: "Image preview", blurb: "Show local images inline, with tabbed before/after comparisons." },
    ],
  },
  {
    label: "Command line",
    pages: [
      { slug: "vorno-cli",
        nav: "CLI", blurb: "Drive Vorno from the terminal: sessions, sources, config, automations." },
    ],
  },
];

export const ALL_PAGES = GROUPS.flatMap((g) => g.pages);

/** Slugs fetched from the vorno repo — these must exist at the build tag. */
export const ALL_SLUGS = ALL_PAGES.filter((p) => !p.authored).map((p) => p.slug);

/** Slugs written for this site, sourced from `docs-src/pages/`. */
export const AUTHORED_SLUGS = ALL_PAGES.filter((p) => p.authored).map((p) => p.slug);

// (Link rewriting used to consult a manifest-derived slug list. It now resolves
// against the set of pages actually built, which is the only list that can be
// right — discovered guides are not in this file at all.)

export const BLURBS = Object.fromEntries(
  GROUPS.flatMap((g) => g.pages.map((p) => [p.slug, p.blurb])),
);

// Guides in a SUBDIRECTORY of apps/electron/resources/docs are auto-discovered
// rather than listed above. `sources/` is a homogeneous set — one page per
// service, all peers, alphabetical — so curating it by hand would mean editing
// this repo every time the vorno repo adds a service. The manifest's job is
// giving the ~19 top-level guides a spine; it is not a registry.
//
// Label for a discovered subdirectory; unknown dirs get a title-cased fallback.
export const SUBDIR_LABELS = {
  sources: "Source setup guides",
};

export function subdirLabel(dir) {
  return (
    SUBDIR_LABELS[dir] ||
    dir.replace(/[-_]/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

/**
 * Starlight `sidebar` config.
 * `discovered` is `{ <dir>: [{ slug, nav }] }` from build-docs.mjs.
 */
export function buildSidebar(discovered = {}) {
  return [
    { label: "Overview", link: "/" },
    ...GROUPS.map((g) => ({
      label: g.label,
      items: g.pages.map((p) => ({ slug: p.slug, label: p.nav })),
    })),
    ...Object.entries(discovered)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dir, pages]) => ({
        label: subdirLabel(dir),
        collapsed: true,
        items: pages.map((p) => ({ slug: p.slug, label: p.nav })),
      })),
  ];
}
