const RELEASES_API = "https://api.github.com/repos/Swagatar-LLC/vorno-releases/releases/latest";
const RELEASES_PAGE = "https://github.com/Swagatar-LLC/vorno-releases/releases/latest";

async function latestDmgUrl() {
  const res = await fetch(RELEASES_API, {
    headers: {
      "user-agent": "vorno-ai-site-worker",
      accept: "application/vnd.github+json",
    },
    // Cache the GitHub API response at the edge so unauthenticated
    // rate limits (shared across Cloudflare egress IPs) aren't a factor.
    cf: { cacheEverything: true, cacheTtl: 300 },
  });
  if (!res.ok) return null;
  const release = await res.json();
  const dmg = (release.assets || []).find((a) => a.name.endsWith(".dmg"));
  return dmg ? dmg.browser_download_url : null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonicalize www → apex.
    if (url.hostname === "www.vorno.ai") {
      url.hostname = "vorno.ai";
      return Response.redirect(url.toString(), 301);
    }

    // OS-aware download: macOS gets sent straight to the latest .dmg;
    // everyone else (and any API failure) falls through to the static
    // /download page, which lists all assets.
    if (url.pathname === "/download" || url.pathname === "/download/") {
      const ua = request.headers.get("user-agent") || "";
      const isMac = /Macintosh|Mac OS X/i.test(ua) && !/iPhone|iPad/i.test(ua);
      if (isMac) {
        try {
          const dmg = await latestDmgUrl();
          return Response.redirect(dmg || RELEASES_PAGE, 302);
        } catch {
          return Response.redirect(RELEASES_PAGE, 302);
        }
      }
    }

    return env.ASSETS.fetch(request);
  },
};
