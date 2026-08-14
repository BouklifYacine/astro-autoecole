import { execFileSync } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const envPath = join(root, ".env");
if (!existsSync(envPath)) throw new Error(".env est absent. Copiez .env.example et complétez-le.");

const entries = Object.fromEntries(
  (await fs.readFile(envPath, "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
    })
    .filter(([key]) => key),
);

function run(args, value) {
  execFileSync("gh", args, { cwd: root, input: value, stdio: ["pipe", "inherit", "inherit"] });
}

for (const [key, value] of Object.entries(entries)) {
  if (!value) continue;
  if (key.startsWith("PUBLIC_") || key === "SITE_URL") run(["variable", "set", key, "--body", value]);
  else run(["secret", "set", key, "--body", value]);
}
console.log("Variables et secrets GitHub envoyés.");
