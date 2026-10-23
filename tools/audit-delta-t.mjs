import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseObserved, parsePredictions } from "./lib/usno-delta-t.mjs";
import { deltaTSeconds } from "../worker/src/astronomy.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2), option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const directory = resolve(root, option("--sources") ?? "docs/sources/astronomy/usno-2026-10-23");
const pinned = "2026-10-01";
const sources = { observations: "https://maia.usno.navy.mil/ser7/deltat.data", predictions: "https://maia.usno.navy.mil/ser7/deltat.preds" };
const sha256 = data => createHash("sha256").update(data).digest("hex");
if (args.includes("--fetch")) {
  const metadata = { retrievedAt: new Date().toISOString(), note: "HTTP Last-Modified is not the prediction issue date; predictions are not observations.", files: {} };
  await mkdir(directory, { recursive: true });
  for (const [name, url] of Object.entries(sources)) {
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `${name}: HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer()); assert.ok(data.length < 262144, "Unexpected source size");
    (name === "observations" ? parseObserved : parsePredictions)(data.toString("utf8"));
    await writeFile(resolve(directory, name + ".txt"), data);
    metadata.files[name] = { url, sha256: sha256(data), bytes: data.length, httpLastModified: response.headers.get("last-modified") };
  }
  await writeFile(resolve(directory, "manifest.json"), JSON.stringify(metadata, null, 2) + "\n");
}
const metadata = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
const parsed = {};
for (const [name, url] of Object.entries(sources)) {
  const data = await readFile(resolve(directory, name + ".txt"));
  assert.equal(metadata.files[name].url, url); assert.equal(metadata.files[name].sha256, sha256(data));
  parsed[name] = (name === "observations" ? parseObserved : parsePredictions)(data.toString("utf8"));
}
const last = parsed.observations.at(-1), future = parsed.predictions.filter(row => row.date > last.date);
const overlap = parsed.predictions.find(row => row.date === last.date);
const report = { retrievedAt: metadata.retrievedAt, pinnedObservedThrough: pinned, latestObservation: last,
  observationsUsedSince2005: parsed.observations.filter(row => row.date >= "2005-01-01").length,
  observationUpdateAvailable: last.date !== pinned,
  prediction: { rows: parsed.predictions.length, first: parsed.predictions[0], last: parsed.predictions.at(-1),
    rowsAfterLastObservation: future.length, overlapAtLastObservation: overlap ? { seconds: overlap.seconds, observedMinusPredicted: last.seconds - overlap.seconds } : null,
    comparisons: parsed.predictions.filter(row => [2027,2030,2033.75].includes(row.yearLabel)).map(row => ({ date: row.date,
      decimalYear: row.decimalYear, sourcePredictionSeconds: row.seconds, sourceError: row.sourceError,
      projectSeconds: deltaTSeconds(row.decimalYear), projectMinusSourceSeconds: deltaTSeconds(row.decimalYear) - row.seconds })) },
  decision: "仅更新资料与差异报告；预测表无明确发行/模型版本，不把HTTP更新时间当作新预测日期，不用于2057/2097或其他表外年份的校准。现有工程外推仍单独披露。" };
const output = resolve(root, option("--report") ?? "build/validation/delta-t-sources.json");
await mkdir(resolve(output, ".."), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.observationUpdateAvailable) process.exitCode = 2;
