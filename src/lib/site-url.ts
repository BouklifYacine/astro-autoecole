import { SITE_URL } from "astro:env/server";

import { site } from "../config/site.config";

export function getSiteUrl(): URL {
  const candidate = SITE_URL?.trim() || `https://${site.domain}`;
  try {
    return new URL(candidate);
  } catch {
    return new URL("https://example.com");
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).href;
}
