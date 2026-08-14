import type { APIRoute } from "astro";

import { site } from "../config/site.config";
import { getSiteUrl } from "../lib/site-url";

export const GET: APIRoute = () => {
  const body = [
    `# ${site.name}`,
    "",
    site.seo.defaultDescription,
    "",
    `URL: ${getSiteUrl().href}`,
    "",
    "Ce fichier décrit brièvement le site pour les agents qui respectent llms.txt.",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
