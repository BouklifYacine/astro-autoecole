import { existsSync, promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const rl = createInterface({ input, output });

async function ask(question, fallback) {
  const answer = (await rl.question(`${question} [${fallback}] `)).trim();
  return answer || fallback;
}

async function askBoolean(question, fallback = true) {
  const answer = (await ask(`${question} (o/n)`, fallback ? "o" : "n")).toLowerCase();
  return answer === "o" || answer === "oui" || answer === "y" || answer === "yes";
}

async function replaceIn(file, replacements) {
  const path = join(root, file);
  let content = await fs.readFile(path, "utf8");
  for (const [from, to] of replacements) content = content.replace(from, to);
  await fs.writeFile(path, content, "utf8");
}

async function remove(relativePath) {
  const path = join(root, relativePath);
  if (existsSync(path)) await fs.rm(path, { recursive: true, force: true });
}

try {
  const name = await ask("Nom du site", "Nom du site");
  const domain = await ask("Domaine sans https://", "example.com");
  const color = await ask("Couleur principale hexadécimale", "#2563eb");
  const kv = (await ask("KV (cloudflare ou upstash)", "cloudflare")).toLowerCase();
  if (!new Set(["cloudflare", "upstash"]).has(kv)) throw new Error("KV non implémenté.");
  const blog = await askBoolean("Conserver le module blog ?", true);
  const analytics = await askBoolean("Conserver le module analytics ?", false);

  await replaceIn("src/config/site.config.ts", [
    ['name: "Nom du site"', `name: ${JSON.stringify(name)}`],
    ['domain: "example.com"', `domain: ${JSON.stringify(domain)}`],
    ['themeColor: "#2563eb"', `themeColor: ${JSON.stringify(color)}`],
    ['titleTemplate: "%s | Nom du site"', `titleTemplate: ${JSON.stringify(`%s | ${name}`)}`],
    ['defaultTitle: "Nom du site"', `defaultTitle: ${JSON.stringify(name)}`],
    ['kv: "cloudflare"', `kv: ${JSON.stringify(kv)}`],
  ]);
  await replaceIn("package.json", [['"name": "astro-boilerplate"', `"name": ${JSON.stringify(domain.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}`]]);
  await replaceIn("wrangler.jsonc", [['"name": "astro-boilerplate"', `"name": ${JSON.stringify(domain.replace(/[^a-z0-9-]/gi, "-").toLowerCase())}`]]);

  if (!blog) {
    await remove("src/content/blog");
    await remove("src/content.config.ts");
    await remove("src/content/schemas.ts");
    await remove("src/pages/blog");
  }
  if (!analytics) {
    await remove("src/components/analytics");
    await remove("src/scripts/consent-analytics.ts");
    await replaceIn("src/layouts/BaseLayout.astro", [
      ['import ConsentAnalytics from "../components/analytics/ConsentAnalytics.astro";\n', ""],
      ["    <ConsentAnalytics {...analytics} />\n", ""],
    ]);
  }

  await fs.writeFile(join(root, "boilerplate.json"), `${JSON.stringify({ version: "1.0.0", initialized: true }, null, 2)}\n`, "utf8");
  console.log("Projet initialisé. Complétez maintenant site.config.ts, le contenu et les secrets.");
} finally {
  rl.close();
  await fs.rm(fileURLToPath(import.meta.url), { force: true });
}
