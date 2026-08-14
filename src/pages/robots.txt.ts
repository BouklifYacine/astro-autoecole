import type { APIRoute } from "astro";

import { site } from "../config/site.config";
import { getSiteUrl } from "../lib/site-url";

export const GET: APIRoute = () => {
  const lines = ["User-agent: *", "Allow: /", ""];
  for (const crawler of site.crawlers.allowed) {
    lines.push(`User-agent: ${crawler}`, "Allow: /", "");
  }
  for (const crawler of site.crawlers.blocked) {
    lines.push(`User-agent: ${crawler}`, "Disallow: /", "");
  }
  lines.push(`Sitemap: ${new URL("sitemap-index.xml", getSiteUrl()).href}`);
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Signal": site.crawlers.contentSignal,
    },
  });
};
