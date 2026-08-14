import { spawnSync } from "node:child_process";

const url = process.argv[2] || process.env.PERF_URL;
if (!url) {
  console.error("Usage : bun scripts/perf.mjs https://site.example/");
  process.exit(1);
}

const command = process.platform === "win32" ? "lighthouse.cmd" : "lighthouse";
const result = spawnSync(command, [url, "--output=json", "--output-path=stdout", "--quiet"], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
if (result.status !== 0) process.exit(result.status ?? 1);
const report = JSON.parse(result.stdout);
const audits = report.audits;
const metrics = {
  lcp: audits["largest-contentful-paint"]?.numericValue,
  cls: audits["cumulative-layout-shift"]?.numericValue,
  tbt: audits["total-blocking-time"]?.numericValue,
  javascript: audits["bootup-time"]?.numericValue,
};
console.log(JSON.stringify(metrics, null, 2));
if (metrics.lcp > 2500 || metrics.cls > 0.1 || metrics.tbt > 200) process.exit(2);
