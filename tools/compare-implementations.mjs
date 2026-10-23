import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { calculateCurrentAlmanac } from "../worker/src/engine.js";
import { semanticResult, contract } from "../worker/src/semantic.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
let base = option("--base-url"), child, log = "", timestampDifferences = 0, maxTimestampDifferenceMs = 0;
const normalize = value => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value !== null && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, normalize(v)]));
  return typeof value === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/u.test(value) ? new Date(value).toISOString() : value;
};
function compare(actual, expected, path) {
  if (actual === expected) return;
  // Java and V8 transcendental functions can differ by an ulp at a millisecond crossing.
  // Limit tolerance to the three astronomical timestamp fields; never tolerate a changed civil date.
  if (/\.(?:天文朔时刻|交节时刻|astronomicalNewMoon|at)$/u.test(path) && typeof actual === "string" && typeof expected === "string") {
    const difference = Math.abs(Date.parse(actual) - Date.parse(expected));
    assert.ok(difference <= 1, `${path}: astronomical difference ${difference} ms`);
    assert.equal(new Date(Date.parse(actual)+28_800_000).toISOString().slice(0,10),
      new Date(Date.parse(expected)+28_800_000).toISOString().slice(0,10), `${path}: changed UTC+08 civil date`);
    timestampDifferences++; maxTimestampDifferenceMs = Math.max(maxTimestampDifferenceMs, difference); return;
  }
  if (actual !== null && expected !== null && typeof actual === "object" && typeof expected === "object") {
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(expected).sort(), path);
    for (const key of Object.keys(expected)) compare(actual[key], expected[key], path+"."+key);
    return;
  }
  assert.deepEqual(actual, expected, path);
}
async function json(path, body) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(15_000), ...(body ? {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, 200, `${path}: ${response.status}`);
  return normalize(await response.json());
}
try {
  if (!base) {
    const listener = createServer();
    await new Promise(resolve => listener.listen(0, "127.0.0.1", resolve));
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    base = `http://127.0.0.1:${port}`;
    const executable = option("--native");
    const flags = [`--server.address=127.0.0.1`, `--server.port=${port}`, "--almanac.security.requests-per-minute=120000", "--almanac.security.burst=120000"];
    child = spawn(executable ? resolve(root, executable) : "java", executable ? flags
      : ["-Xmx256m", "-jar", resolve(root, option("--jar") ?? "build/libs/wannianli-api-1.0.0.jar"), ...flags], { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", data => { log = (log + data).slice(-6000); });
    child.stderr.on("data", data => { log = (log + data).slice(-6000); });
    child.on("error", error => { log += String(error); });
    const deadline = Date.now() + 90000;
    while (true) {
      try { if ((await fetch(base + "/api/v2/almanac/capabilities", { signal: AbortSignal.timeout(1000) })).ok) break; } catch { }
      if (child.exitCode !== null || Date.now() > deadline) throw new Error("Java did not start: " + log);
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(base).hostname)) throw new Error("Bulk parity checks require a loopback test instance");
  let days = 0, v2SampledDays = 0;
  for (let t = Date.parse("2020-01-01T04:30:15Z"); t < Date.parse("2025-01-01T04:30:15Z"); t += 86400000) {
    const instant = new Date(t), date = instant.toISOString().slice(0,10);
    const input = { 历法: "公历", 年: instant.getUTCFullYear(), 月: instant.getUTCMonth()+1, 日: instant.getUTCDate(), 时: 12, 分: 30, 秒: 15 };
    const expected = calculateCurrentAlmanac(instant);
    compare(await json("/api/v1/almanac/calculate", input), normalize(expected), date);
    if (days % 7 === 0) {
      compare(await json("/api/v2/almanac", { date, time: "12:30:15" }), normalize(semanticResult(expected)), date + ".v2");
      v2SampledDays++;
    }
    days++;
  }
  const dates = ["1801-01-01", "2199-12-31", "1900-02-28", "2000-02-29", "1912-11-22", "1917-12-08", "1979-01-20", "2033-12-22", "2057-09-29", "2089-09-04", "2097-08-07", "2192-05-12"];
  for (const date of dates) compare(await json("/api/v2/almanac", {date, time:"12:30:15"}),
    normalize(semanticResult(calculateCurrentAlmanac(new Date(date+"T04:30:15Z")))), date);
  assert.deepEqual(await json("/api/v2/almanac/capabilities"), contract.capabilities);
  const ranges = [["2020-05-22", "2020-05-23"], ["2020-12-31", "2021-01-01"], ["2199-12-30", "2199-12-31"]];
  for (const [startDate, endDate] of ranges) {
    const actual = await json("/api/v2/almanac/range", { startDate, endDate, time: "12:30:15" });
    assert.equal(actual.range.days, 2); assert.equal(actual.range.quotaUnits, 2);
    compare(actual.results, [startDate, endDate].map(date => normalize(semanticResult(calculateCurrentAlmanac(new Date(date + "T04:30:15Z"))))), startDate + ".range");
  }
  // Exercise real HTTP using both generations of the official MCP client SDK.
  const clientCheck = spawn(process.execPath, ["--test", "test/mcp.test.js"], { cwd: resolve(root,"worker"),
    env: { ...process.env, WANNIANLI_MCP_URL: base }, stdio: "inherit" });
  const clientExit = await new Promise((resolve,reject) => {clientCheck.on("exit",resolve);clientCheck.on("error",reject);});
  assert.equal(clientExit, 0, "Official MCP client conformance failed");
  assert.equal(v2SampledDays, Math.ceil(days / 7));
  console.log(JSON.stringify({ days, v2Cases: v2SampledDays + dates.length, v2SampledDays, v2BoundaryCases: dates.length,
    v2RangeCases: ranges.length, mcpSdkGenerations: 2, timestampDifferences, maxTimestampDifferenceMs,
    result: "Business fields match exactly; only astronomical timestamps allow <=1 ms within the same UTC+08 civil date" }));
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([new Promise(resolve => child.once("exit",resolve)), new Promise(resolve => {
      const timer=setTimeout(()=>{child.kill("SIGKILL");resolve();},5000); timer.unref();
    })]);
  }
}
