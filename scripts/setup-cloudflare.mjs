import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const wrangler = process.platform === "win32" ? "wrangler.cmd" : "wrangler";

function createNamespace(binding) {
  const output = execFileSync(wrangler, ["kv", "namespace", "create", binding, "--remote", "--json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const match = output.match(/\{[\s\S]*\}/m);
  if (!match) throw new Error(`Impossible de lire l’ID KV pour ${binding}.`);
  const parsed = JSON.parse(match[0]);
  const id = parsed?.id ?? parsed?.namespace_id;
  if (!id) throw new Error(`Réponse KV sans ID pour ${binding}.`);
  return id;
}

const wranglerPath = join(root, "wrangler.jsonc");
let config = await fs.readFile(wranglerPath, "utf8");
const id = createNamespace("LEAD_RATE_LIMIT");
config = config.replace(/("binding":\s*"LEAD_RATE_LIMIT"[\s\S]*?"id":\s*")[^"]*(")/, `$1${id}$2`);
await fs.writeFile(wranglerPath, config, "utf8");
console.log(`LEAD_RATE_LIMIT configuré avec l’ID ${id}.`);
