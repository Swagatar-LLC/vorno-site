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

export const GROUPS = [
  {
    label: "Connect your data",
    pages: [
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

export const ALL_SLUGS = GROUPS.flatMap((g) => g.pages.map((p) => p.slug));

export const BLURBS = Object.fromEntries(
  GROUPS.flatMap((g) => g.pages.map((p) => [p.slug, p.blurb])),
);

/** Starlight `sidebar` config, built from the same manifest. */
export const SIDEBAR = [
  { label: "Overview", link: "/" },
  ...GROUPS.map((g) => ({
    label: g.label,
    items: g.pages.map((p) => ({ slug: p.slug, label: p.nav })),
  })),
];
