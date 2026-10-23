import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { calculateAuditableAlmanac, calculateCurrentAlmanac } from "../worker/src/engine.js";

const args = process.argv.slice(2);
const paceIndex = args.indexOf("--pace-ms");
const paceMs = paceIndex >= 0 ? Number(args.splice(paceIndex, 2)[1]) : 0;
assert.ok(Number.isInteger(paceMs) && paceMs >= 0 && paceMs <= 5000, "--pace-ms must be 0-5000");
const reportIndex = args.indexOf("--report");
const reportFile = reportIndex >= 0 ? args.splice(reportIndex, 2)[1] : undefined;
assert.ok(args.length > 0, "usage: node tools/verify-deployment.mjs <base-url> [base-url] [--report file]");

function normalized(value) {
  const result = structuredClone(value);
  result["当前时间"] = new Date(result["当前时间"]).toISOString();
  result["农历"]["天文朔时刻"] = new Date(result["农历"]["天文朔时刻"]).toISOString();
  for (const key of ["前一节气", "下一节气"]) result["节气"][key]["交节时刻"] = new Date(result["节气"][key]["交节时刻"]).toISOString();
  return result;
}

const results = [];
for (const base of args) {
  const checks = [];
  async function request(name, path, init = {}, status = 200) {
    if (paceMs) await new Promise(resolve => setTimeout(resolve, paceMs));
    const response = await fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    assert.equal(response.status, status, `${base} ${name}: ${response.status} ${text.slice(0, 200)}`);
    assert.equal(response.headers.get("cache-control"), "no-store", name);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", name);
    assert.equal(response.headers.get("x-frame-options"), "DENY", name);
    checks.push({ name, status });
    return { response, text, data: text ? JSON.parse(text) : undefined };
  }
  for (const path of ["/", "/api/v1/almanac/current"]) {
    const { data } = await request(`current ${path}`, path);
    assert.deepEqual(normalized(data), normalized(calculateCurrentAlmanac(new Date(data["当前时间"]))), `${base}: current calculation`);
  }
  const api = "/api/v1/almanac/calculate";
  const post = (body) => ({ method: "POST", headers: { "content-type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const instant = new Date("2026-08-03T04:30:15Z");
  const solar = { "历法": "公历", "年": 2026, "月": 8, "日": 3, "时": 12, "分": 30, "秒": 15 };
  const lunar = { "历法": "农历", "年": 2026, "月": 6, "日": 21, "时": 12, "分": 30, "秒": 15 };
  for (const [name, input] of [["Gregorian seconds", solar], ["lunar seconds", lunar]]) {
    const { data } = await request(name, api, post(input));
    assert.deepEqual(normalized(data), normalized(calculateCurrentAlmanac(instant)), name);
  }
  const leapInput = { "历法": "农历", "年": 2020, "月": 4, "日": 1, "是否闰月": "是", "时": 23, "分": 59, "秒": 59 };
  const leapResult = await request("lunar leap month", api, post(leapInput));
  assert.deepEqual(normalized(leapResult.data), normalized(calculateCurrentAlmanac(new Date("2020-05-23T15:59:59Z"))));
  const brokenDay = await request("month-break taboos", api, post({ "历法": "公历", "年": 2020, "月": 2, "日": 23, "时": 12 }));
  const brokenExpected = calculateAuditableAlmanac(new Date("2020-02-23T04:00:00Z"));
  assert.deepEqual(normalized(brokenDay.data), normalized(brokenExpected.result));
  const taboos = brokenExpected.audit.ruleHits.find((hit) => hit.ruleId === "OFFICER_破").avoids;
  assert.equal(taboos.length, 60);
  for (const activity of taboos) {
    assert.ok(brokenDay.data["宜忌"]["忌"].includes(activity), activity);
    assert.ok(!brokenDay.data["宜忌"]["宜"].includes(activity), activity);
  }
  for (const [name, body, status] of [
    ["impossible Gregorian date", { ...solar, "月": 2, "日": 30 }, 400],
    ["unknown lunar leap month", { "历法": "农历", "年": 2026, "月": 6, "日": 1, "是否闰月": "是" }, 400],
    ["escaped duplicate field", String.raw`{"历法":"公历","年":2026,"\u5e74":2025,"月":8,"日":3}`, 400],
    ["injection-shaped number", { ...solar, "年": "2026 OR 1=1" }, 400],
    ["oversized body", " ".repeat(1025), 413],
  ]) {
    const { data } = await request(name, api, post(body), status);
    assert.deepEqual(Object.keys(data), ["错误"], name);
    assert.ok(!/Exception|Traceback|[A-Za-z]:[\\/]/u.test(data["错误"]), name);
  }
  await request("unsupported content type", api, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }, 415);
  const method = await request("unsupported method", api, {}, 405);
  assert.equal(method.response.headers.get("allow"), "POST");
  await request("unknown query", "/api/v1/almanac/current?year=2026", {}, 400);
  await request("unknown API path", "/api/v1/almanac/unknown", {}, 404);
  const head = await request("HEAD", "/api/v1/almanac/current", { method: "HEAD" });
  assert.equal(head.text, "");
  results.push({ base, checks: checks.length, monthBreakTaboosRetained: taboos.length, result: "passed", details: checks });
}
const report = { verifiedAt: new Date().toISOString(), results };
if (reportFile) {
  const target = resolve(reportFile);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
