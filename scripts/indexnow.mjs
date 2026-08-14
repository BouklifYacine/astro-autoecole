import { promises as fs } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const key = process.env.INDEXNOW_KEY;
const host = process.env.SITE_URL;
if (!key || !host) {
  console.log("IndexNow inactif : INDEXNOW_KEY ou SITE_URL absent.");
  process.exit(0);
}

const sitemapPath = join(root, "dist", "sitemap-0.xml");
const sitemap = await fs.readFile(sitemapPath, "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(host).host, key, keyLocation: `${host.replace(/\/$/, "")}/${key}.txt`, urlList }),
});
if (!response.ok) throw new Error(`IndexNow a répondu ${response.status}.`);
console.log(`IndexNow : ${urlList.length} URL(s) envoyée(s).`);
