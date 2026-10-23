import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "../src/index.js";
import { RequestGuard } from "../src/security.js";
import { semanticResult } from "../src/semantic.js";
import { calculateCurrentAlmanac } from "../src/engine.js";

const call = (path, options = {}, guard = new RequestGuard({ burst: 10000 }), rateLimiter) =>
  handleRequest(new Request("http://localhost" + path, options), () => new Date("2026-08-03T04:00:00Z"), { guard, rateLimiter });
const post = value => ({ method: "POST", headers: { "content-type": "application/json" }, body: typeof value === "string" ? value : JSON.stringify(value) });

test("range GET and POST preserve every single-day field across a year and a lunar leap boundary", async () => {
  for (const [startDate, endDate] of [["2020-12-31", "2021-01-01"], ["2020-05-22", "2020-05-23"], ["2199-12-30", "2199-12-31"]]) {
    const input = { startDate, endDate, time: "23:59:59" };
    const get = await call("/api/v2/almanac/range?" + new URLSearchParams(input));
    const body = await call("/api/v2/almanac/range", post(input));
    assert.equal(get.status, 200); const result = await get.json();
    assert.deepEqual(result, await body.json()); assert.equal(result.range.quotaUnits, 2);
    assert.deepEqual(result.results, [startDate, endDate].map(date => semanticResult(calculateCurrentAlmanac(new Date(date + "T15:59:59Z")))));
  }
});

test("range rejects excess dates, reverse order, invalid days, duplicate keys and unrelated calendar fields", async () => {
  for (const input of [{}, null, { startDate: "2020-01-02", endDate: "2020-01-01" },
    { startDate: "2020-01-01", endDate: "2020-01-15" }, { startDate: "2020-02-30", endDate: "2020-03-01" },
    { startDate: "1800-12-31", endDate: "1801-01-01" }, { startDate: "2020-01-01", endDate: "2020-01-02", calendar: "lunar" },
    { startDate: "2020-01-01", endDate: "2020-01-02", time: null },
    '{"startDate":"2020-01-01","startDate":"2020-01-02","endDate":"2020-01-03"}']) {
    assert.equal((await call("/api/v2/almanac/range", post(input))).status, 400, JSON.stringify(input));
  }
  assert.equal((await call("/api/v2/almanac/range?startDate=2020-01-01&startDate=2020-01-02&endDate=2020-01-03")).status, 400);
});

test("range charges each day to the local and native shared budgets and keeps one concurrency permit", async () => {
  const guard = new RequestGuard({ now: () => 0 }); let units = 0;
  const limiter = { limit: async () => { units++; return { success: true }; } };
  const response = await call("/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-14", {}, guard, limiter);
  assert.equal(response.status, 200); const text = await response.text();
  assert.ok(new TextEncoder().encode(text).length <= 262144); assert.equal(JSON.parse(text).results.length, 14);
  assert.equal(units, 14); assert.equal(guard.active, 0); assert.equal(guard.tokens, 6);
  const limited = await call("/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-07", {}, guard, limiter);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "1"); assert.equal(guard.active, 0);
});

test("MCP range shares the HTTP budget and HEAD validates without charging uncomputed days", async () => {
  const guard = new RequestGuard({ now: () => 0 });
  const head = await call("/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-14", { method: "HEAD" }, guard);
  assert.equal(head.status, 200); assert.equal(await head.text(), ""); assert.equal(guard.tokens, 19);
  assert.equal((await call("/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-14", {}, guard)).status, 200);
  const rpc = post({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "calculate_almanac_range", arguments: { startDate: "2020-01-01", endDate: "2020-01-06" } } });
  rpc.headers.accept = "application/json, text/event-stream"; rpc.headers["mcp-protocol-version"] = "2025-11-25";
  const limited = await call("/mcp", rpc, guard);
  assert.equal(limited.status, 429); assert.equal(limited.headers.get("retry-after"), "1"); assert.equal(guard.active, 0);
});
