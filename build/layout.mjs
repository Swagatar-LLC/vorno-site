// The hand-written site shell, reused by generated pages so /changelog looks
// like /, /download and /links rather than like a separate property.
//
// The two footer lines are required verbatim on every page (vorno-site README
// guardrail) and are enforced by build/verify.mjs.

export const NAV = `<nav class="nav">
  <a class="brand" href="/" style="display:flex;align-items:center;gap:10px"><img src="/assets/logo-mark.svg" alt="Vorno mark">Vorno</a>
  <div class="links">
    <a href="/download">Download</a>
    <a href="/docs">Docs</a>
    <a href="/changelog">Changelog</a>
    <a href="/blog">Blog</a>
    <a href="https://github.com/Swagatar-LLC/vorno">GitHub</a>
  </div>
</nav>`;

export const FOOTER = `<footer>
  <p>© 2026 Swagatar, LLC · <a href="mailto:hello@vorno.ai">hello@vorno.ai</a> · <a href="/links">All links</a></p>
  <p>Powered by Claude.</p>
  <p>Vorno is not affiliated with or endorsed by Craft Docs Ltd.</p>
</footer>`;

export function layout({ title, description, canonical, main }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description.replace(/"/g, "&quot;")}">
${canonical ? `<link rel="canonical" href="${canonical}">\n` : ""}<link rel="icon" type="image/svg+xml" href="/assets/logo-mark.svg">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
${NAV}
<main>
${main}
</main>
${FOOTER}
</body>
</html>
`;
}
