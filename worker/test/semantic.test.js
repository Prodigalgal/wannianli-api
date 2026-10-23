import assert from "node:assert/strict";
import test from "node:test";
import { handleRequest } from "../src/index.js";
import { RequestGuard } from "../src/security.js";
import { contract, openApi, semanticResult } from "../src/semantic.js";
import { calculateCurrentAlmanac } from "../src/engine.js";
import { readFile } from "node:fs/promises";

const now = () => new Date("2026-08-03T04:30:15Z");
const call = (path, options = {}) => handleRequest(new Request("http://localhost" + path, options), now,
  { guard: new RequestGuard({ perMinute: 10000, burst: 10000 }) });
const post = body => call("/api/v2/almanac", { method: "POST", headers: { "content-type": "application/json" }, body });

test("v2 Gregorian GET, JSON POST, and lunar leap input have identical semantic results", async () => {
  const g = await (await call("/api/v2/almanac?date=2020-05-23&time=23:59:59")).json();
  const l = await (await post(JSON.stringify({ calendar: "lunar", date: "2020-04-01", time: "23:59:59", leapMonth: true }))).json();
  assert.deepEqual(g, l);
  assert.equal(g.dateTime, "2020-05-23T23:59:59.000+08:00");
  assert.equal(g.lunar.leapMonth, true);
  assert.equal(g.utcOffset, "+08:00");
  assert.equal(typeof g.activities.virtuePresent, "boolean");
  const short = await (await post('{"date":"2026-08-03","time":"12:30"}')).json();
  assert.equal(short.dateTime, "2026-08-03T12:30:00.000+08:00");
  const midnight = await (await post('{"date":"2026-08-03"}')).json();
  assert.equal(midnight.dateTime, "2026-08-03T00:00:00.000+08:00");
  const current = await (await call("/api/v2/almanac/now")).json();
  assert.deepEqual(current, semanticResult(calculateCurrentAlmanac(now())));
});

test("v2 rejects ambiguous, mistyped, unknown, invalid, or oversized input with stable error codes", async () => {
  for (const body of ['{}', 'null', '[]', '{"date":"2026-02-30"}', '{"date":"1900-02-29"}',
    '{"date":"2026-08-03","date":"2024-01-01"}', '{"date":"2026-08-03","leapMonth":"true"}',
    '{"date":"2026-08-03","leapMonth":true}', '{"date":"2026-08-03","time":"24:00"}',
    '{"date":"2026-08-03","time":null}', '{"date":"2026-08-03","year":2026}',
    '{"date":"2026-08-03","__proto__":{}}', '{"date":"2026-08-03","calendar":"公历"}']) {
    const response = await post(body);
    assert.equal(response.status, 400, body);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  }
  for (const query of ["date=2026-08-03&date=2026-08-03", "date=2026-08-03&leapMonth=1", "date=2026-08-03&x=1", "date=%XX"]) {
    assert.equal((await call("/api/v2/almanac?" + query)).status, 400);
  }
  assert.equal((await post(" ".repeat(1025))).status, 413);
});

test("capabilities and standalone OpenAPI schemas are shared with Java and MCP", async () => {
  assert.deepEqual(await (await call("/api/v2/almanac/capabilities")).json(), contract.capabilities);
  const api = await (await call("/api/v2/almanac/openapi.json")).json();
  assert.equal(api.openapi, "3.1.0");
  assert.deepEqual(api, JSON.parse(await readFile(new URL("../../src/main/resources/api/openapi.json", import.meta.url), "utf8")));
  assert.deepEqual(api, openApi());
});

test("every recursively published v1 field and boolean is covered by the v2 contract", () => {
  const keys = new Set(), booleans = new Set();
  const collect = value => {
    if (Array.isArray(value)) return value.forEach(collect);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      if (child === "是" || child === "否") booleans.add(contract.fieldNames[key]);
      collect(child);
    }
  };
  for (const date of ["2026-08-03T04:30:15Z", "2026-12-25T04:30:15Z"]) collect(calculateCurrentAlmanac(new Date(date)));
  assert.deepEqual([...keys].sort(), Object.keys(contract.fieldNames).sort());
  assert.deepEqual([...booleans].sort(), [...contract.booleanKeys].sort());
  const changed = calculateCurrentAlmanac(now());
  changed.公历.未映射新增字段 = "test";
  assert.throws(() => semanticResult(changed), /Unmapped public result field/u);
});

test("v2 adds stable day grade codes while retaining labels and declares working HEAD operations", async () => {
  const legacy = calculateCurrentAlmanac(now());
  for (const [code, label] of Object.entries(contract.capabilities.dayGrades)) {
    const value = structuredClone(legacy);
    value.宜忌.日等 = label;
    const result = semanticResult(value);
    assert.equal(result.activities.dayGrade, label);
    assert.equal(result.activities.dayGradeCode, code);
    assert.ok(contract.outputSchema.properties.activities.properties.dayGradeCode.enum.includes(code));
  }
  const api = openApi();
  const operationIds = new Set();
  for (const [path, operations] of Object.entries(api.paths)) {
    assert.ok(operations.head, path);
    assert.deepEqual(operations.head.parameters, operations.get.parameters);
    assert.deepEqual(Object.keys(operations.head.responses), Object.keys(operations.get.responses));
    for (const response of Object.values(operations.head.responses)) assert.ok(!Object.hasOwn(response, "content"));
    for (const operation of Object.values(operations)) {
      assert.ok(!operationIds.has(operation.operationId));
      operationIds.add(operation.operationId);
    }
    const response = await call(path + (path.endsWith("/range") ? "?startDate=2026-08-03&endDate=2026-08-04" : path === "/api/v2/almanac" ? "?date=2026-08-03" : ""), { method: "HEAD" });
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "");
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
});
