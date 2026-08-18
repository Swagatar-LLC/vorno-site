---
title: What Vorno can render
description: The output formats Vorno renders inline — tables, diagrams, HTML, markdown, PDFs, and images — and which one fits what you are trying to show.
---

Most agent interfaces can only give you text. Vorno renders a handful of richer
formats directly in the conversation, so results arrive as something you can
sort, read, or export rather than as a wall of JSON.

You do not invoke these. The agent picks a format and emits it; this page is so
you know what is available and can ask for something specific when the default
is not what you wanted.

The pages below are the format specifications, written for the agent. Read one
when you want to know exactly what a format supports.

## Choosing a format

| You want to show… | Format | Guide |
|---|---|---|
| Rows of data you might sort, filter, or export | Data table / spreadsheet | [Data Tables](/docs/data-tables/) |
| A relationship, flow, sequence, or trend | Mermaid diagram | [Mermaid](/docs/mermaid/) |
| Content that is already HTML — an email body, a styled report | HTML preview | [HTML Preview](/docs/html-preview/) |
| A markdown file, rendered rather than dumped | Markdown preview | [Markdown Preview](/docs/markdown-preview/) |
| A PDF, inline, with page navigation | PDF preview | [PDF Preview](/docs/pdf-preview/) |
| A screenshot or image file, inline | Image preview | [Image Preview](/docs/image-preview/) |

## What is worth knowing

**Tables scale.** Past roughly twenty rows the agent writes the data to a file
and points the table at it instead of inlining every row. The table looks the
same to you; it just costs far less to produce. Spreadsheets are the same
machinery with an export button — ask for one when you want the `.xlsx`.

**Diagrams beat ASCII art.** If you find yourself reading a hand-drawn box
diagram in a code block, ask for a Mermaid diagram instead. Several smaller
focused diagrams also read better than one large one, and the agent is told to
split them for that reason.

**Previews are for fidelity.** HTML, PDF, markdown, and image previews all
exist for the same reason: converting the content to plain text would lose
something that matters — layout, styling, or the image itself. HTML renders in
a sandbox, so scripts do not run and links are not clickable.

**Previews can be tabbed.** Any of the four preview types can show several
items with a tab bar — useful for before/after comparisons, or a set of related
documents side by side.

## Asking for something different

Plain language works: "show that as a table," "make it a diagram," "give me
that as a spreadsheet I can download," "just show me the raw text." The formats
are suggestions the agent makes, not decisions it is locked into.
