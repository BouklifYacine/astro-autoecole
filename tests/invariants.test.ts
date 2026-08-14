import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = join(root, "src");

function filesIn(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesIn(path) : [path];
  });
}

function sourceFiles(): string[] {
  return filesIn(src).filter((path) => /\.(astro|ts|tsx|js|mjs)$/.test(path));
}

describe("boilerplate contracts", () => {
  it("I1 — keeps source-site values out of the implementation", () => {
    const forbidden = [
      "BoyaSolution",
      "boyasolution.net",
      "dbe8df03b65548568582f6df26b707f3",
      "8f6995c8661347959b175eb2f833911e",
      "pOnB2UIIPxmo0BimOSfOhsIWtDZ8I1RdIcXNR1pTV2g",
    ];
    const violations = sourceFiles()
      .filter((path) => !path.includes(`${join("src", "config")}${path.includes("\\") ? "\\" : "/"}`))
      .flatMap((path) => {
        const content = readFileSync(path, "utf8");
        return forbidden.filter((value) => content.includes(value)).map((value) => `${relative(root, path)}: ${value}`);
      });
    expect(violations).toEqual([]);
  });

  it("I2 — allows on-demand rendering only under /api", () => {
    const violations = sourceFiles()
      .filter((path) => path.includes(`${join("src", "pages")}`))
      .filter((path) => /export\s+const\s+prerender\s*=\s*false/.test(readFileSync(path, "utf8")))
      .filter((path) => !path.includes(`${join("src", "pages", "api")}`));
    expect(violations).toEqual([]);
    expect(readFileSync(join(src, "pages", "api", "leads.ts"), "utf8")).toContain('from "cloudflare:workers"');
  });

  it("I3 — contains no raw img element", () => {
    const violations = sourceFiles().filter((path) => /<img\b/i.test(readFileSync(path, "utf8")));
    expect(violations).toEqual([]);
  });

  it("I7 — emits unique titles and descriptions when a build exists", () => {
    const dist = join(root, "dist");
    if (!existsSync(dist)) {
      expect(readFileSync(join(src, "layouts", "BaseLayout.astro"), "utf8")).toContain("<title>{seo.title}</title>");
      return;
    }
    const htmlFiles = filesIn(dist).filter((path) => path.endsWith(".html"));
    const titles = htmlFiles.map((path) => readFileSync(path, "utf8").match(/<title>([^<]+)<\/title>/i)?.[1]).filter(Boolean);
    const descriptions = htmlFiles.map((path) => readFileSync(path, "utf8").match(/name="description" content="([^"]+)"/i)?.[1]).filter(Boolean);
    expect(new Set(titles).size).toBe(titles.length);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("I8 — ships a 404 document the host can serve with a 404 status", () => {
    // Under `output: 'static'` the status comes from the host serving 404.html, not
    // from the page: `Astro.response.status` is a no-op in a prerendered route.
    // Asserting the artifact is therefore the only assertion that means anything.
    expect(existsSync(join(src, "pages", "404.astro"))).toBe(true);

    const dist = join(root, "dist");
    if (!existsSync(dist)) return;

    const notFound = join(dist, "client", "404.html");
    expect(existsSync(notFound)).toBe(true);
    // A soft 404 is a 404 document that does not say it is one.
    expect(readFileSync(notFound, "utf8")).toMatch(/introuvable|not found|404/i);
  });

  it("I13 — keeps provider-specific imports in adapters", () => {
    const forbiddenImport = /(?:from|import\s*\()[\s"'](?:resend|@upstash|@sanity|sanity)(?:["'])/i;
    const violations = sourceFiles()
      .filter((path) => !path.includes(`${join("src", "lib", "adapters")}`))
      .filter((path) => forbiddenImport.test(readFileSync(path, "utf8")));
    expect(violations).toEqual([]);
  });

  it("R1 — does not use the removed Astro.locals runtime binding", () => {
    // Comments are stripped first: documenting WHY the removed API is not used must
    // not trip the guard that forbids using it.
    const contents = sourceFiles()
      .map((path) => readFileSync(path, "utf8"))
      .join("\n")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(contents).not.toContain("locals.runtime.env");
    expect(readFileSync(join(src, "lib", "site-url.ts"), "utf8")).toContain('from "astro:env/server"');
  });
});
