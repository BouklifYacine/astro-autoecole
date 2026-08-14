import { existsSync, promises as fs } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
if (!existsSync(dist)) throw new Error("dist est absent. Lancez bun run build avant la vérification.");

async function filesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else files.push(path);
  }
  return files;
}

const htmlFiles = (await filesIn(dist)).filter((path) => path.endsWith(".html"));
const titles = new Map();
const descriptions = new Map();
for (const file of htmlFiles) {
  const html = await fs.readFile(file, "utf8");
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i)?.[1]?.trim();
  if (title) titles.set(title, [...(titles.get(title) ?? []), relative(dist, file)]);
  if (description) descriptions.set(description, [...(descriptions.get(description) ?? []), relative(dist, file)]);
  for (const image of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\bwidth="\d+"/.test(image[0]) || !/\bheight="\d+"/.test(image[0])) {
      throw new Error(`Image sans dimensions dans ${relative(dist, file)}.`);
    }
  }
}

const duplicateTitles = [...titles].filter(([, paths]) => paths.length > 1);
const duplicateDescriptions = [...descriptions].filter(([, paths]) => paths.length > 1);
if (duplicateTitles.length || duplicateDescriptions.length) {
  throw new Error(`Métadonnées SEO dupliquées : ${JSON.stringify({ duplicateTitles, duplicateDescriptions })}`);
}

const baseUrl = process.argv[2] || process.env.VERIFY_BASE_URL;
if (baseUrl) {
  const indexUrl = new URL("sitemap-index.xml", baseUrl);
  const index = await (await fetch(indexUrl)).text();
  const sitemapUrls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const urls = [];
  for (const sitemapUrl of sitemapUrls) {
    const sitemap = await (await fetch(sitemapUrl)).text();
    urls.push(...[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
  }
  for (const url of urls) {
    const response = await fetch(url);
    if (response.status !== 200) throw new Error(`URL du sitemap non-200 : ${url} (${response.status}).`);
  }
}

console.log(`Build vérifié : ${htmlFiles.length} pages HTML, titres et descriptions uniques.`);
