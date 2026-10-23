import assert from "node:assert/strict";
import test from "node:test";

import worker, { handleRequest } from "../src/index.js";
import { calculateCurrentAlmanac } from "../src/engine.js";
import { RequestGuard } from "../src/security.js";

const URL = "https://example.test/api/v1/almanac/calculate";
const SOLAR = { "历法": "公历", "年": 2026, "月": 8, "日": 3, "时": 12, "分": 34, "秒": 56 };
const now = () => new Date("2026-10-22T04:00:00Z");
const request = (body, headers = {}, extra = {}) => new Request(URL, {
  method: "POST", headers: { "content-type": "application/json", ...headers },
  body: typeof body === "object" && !(body instanceof Uint8Array) && !(body instanceof ReadableStream)
    ? JSON.stringify(body) : body,
  ...extra,
});
const serve = (value, options = {}) => handleRequest(value, now, { guard: new RequestGuard(), ...options });

test("calculates Gregorian and lunar submissions at the same UTC+8 second", async () => {
  const gregorian = await serve(request(SOLAR));
  const lunar = await serve(request({ ...SOLAR, "历法": "农历", "月": 6, "日": 21 }));
  assert.equal(gregorian.status, 200);
  assert.equal(lunar.status, 200);
  const result = await gregorian.json();
  assert.deepEqual(result, await lunar.json());
  assert.deepEqual(result, calculateCurrentAlmanac(new Date("2026-08-03T04:34:56Z")));
  assert.equal(result["当前时间"], "2026-08-03T12:34:56.000+08:00");
});

test("distinguishes regular/leap months and defaults an omitted clock to midnight", async () => {
  for (const [leap, expected] of [["否", "2020-04-23"], ["是", "2020-05-23"]]) {
    const response = await serve(request({ "历法": "农历", "年": 2020, "月": 4, "日": 1, "是否闰月": leap }));
    assert.equal(response.status, 200);
    const value = await response.json();
    assert.equal(value["公历"]["日期"], expected);
    assert.equal(value["农历"]["是否闰月"], leap);
    assert.equal(value["当前时间"], `${expected}T00:00:00.000+08:00`);
  }
});

test("rejects invalid fields, dates, types, injection strings, and ambiguous JSON", async () => {
  const objects = [
    {}, { ...SOLAR, "历法": "阳历" }, { ...SOLAR, "历法": null },
    ...[1800, 2200, -1, 2_147_483_648, "2026", null, true].map((value) => ({ ...SOLAR, "年": value })),
    ...[0, 13, 1.5, "8", {}, []].map((value) => ({ ...SOLAR, "月": value })),
    ...[0, 32, null].map((value) => ({ ...SOLAR, "日": value })),
    ...[-1, 24, "12", null].map((value) => ({ ...SOLAR, "时": value })),
    ...[-1, 60, null].map((value) => ({ ...SOLAR, "分": value })),
    ...[-1, 60, null].map((value) => ({ ...SOLAR, "秒": value })),
    { ...SOLAR, "年": 1900, "月": 2, "日": 29 }, { ...SOLAR, "月": 2, "日": 30 },
    { ...SOLAR, "是否闰月": "是" }, { ...SOLAR, "是否闰月": true },
    { ...SOLAR, "历法": "农历", "月": 2, "日": 30 },
    { ...SOLAR, "历法": "农历", "是否闰月": "是" },
    { ...SOLAR, "历法": "农历", "年": 2199, "月": 12, "日": 1 },
    { ...SOLAR, "历法": "农历", "年": 1800, "月": 1, "日": 1 },
    { ...SOLAR, "时区": "UTC" },
    { ...SOLAR, "历法": "<script>alert(1)</script>" },
    { ...SOLAR, "年": "2026; DROP TABLE dates" },
    { ...SOLAR, "年": "${jndi:ldap://example.invalid/a}" },
  ];
  const raw = [
    "null", "[]", '"text"', "", "{", '{"年":', '{"年":2026,}',
    `${JSON.stringify(SOLAR)} {}`, JSON.stringify(SOLAR).replace('2026', '2026.0'),
    JSON.stringify(SOLAR).replace('2026', '2026e0'),
    JSON.stringify(SOLAR).replace('2026', '02026'),
    JSON.stringify(SOLAR).replace('2026', '99999999999999999999999'),
    JSON.stringify(SOLAR).replace('{', '{"年":2020,'),
    JSON.stringify(SOLAR).replace('{', '{"\\u5e74":2020,'),
    '{"__proto__":{"polluted":true}}', '{"constructor":{"prototype":{"polluted":true}}}',
    '{"历法":"公历","年":NaN}', '{"历法":"公历","年":Infinity}',
    '{"历法":"公历","月":[[[[[1]]]]]}', '\uFEFF' + JSON.stringify(SOLAR),
    JSON.stringify(SOLAR).replace('{', '{/* comment */'),
    JSON.stringify(SOLAR).replace('"公历"', '"公\u0000历"'),
  ];
  // Define the own property explicitly: an object-literal __proto__ only changes its prototype.
  objects.push(Object.assign(Object.create(null), SOLAR, { constructor: "attack" }));
  for (const body of [...objects, ...raw]) {
    const response = await serve(request(body));
    assert.equal(response.status, 400, JSON.stringify(body));
    const result = await response.json();
    assert.deepEqual(Object.keys(result), ["错误"]);
    assert.doesNotMatch(result["错误"], /Exception|Stack|SELECT|DROP|jndi|<script>|prototype/u);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
  assert.equal({}.polluted, undefined);
});

test("bounds known-length and streamed bodies, rejects compression and malformed UTF-8", async () => {
  const oversized = " ".repeat(1025);
  assert.equal((await serve(request(oversized, { "content-length": "1025" }))).status, 413);
  let canceled = false;
  const body = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(600)); controller.enqueue(new Uint8Array(600)); },
    cancel() { canceled = true; },
  });
  assert.equal((await serve(request(body, {}, { duplex: "half" }))).status, 413);
  assert.equal(canceled, true);
  assert.equal((await serve(request(new Uint8Array([0xff, 0xfe, 0x7b, 0x7d])))).status, 400);
  assert.equal((await serve(request(SOLAR, { "x-oversized": "a".repeat(8192) }))).status, 431);
  for (const headers of [
    { "content-type": "text/plain" }, { "content-type": "application/json; charset=GBK" },
    { "content-encoding": "gzip" }, { "content-type": "application/x-www-form-urlencoded" },
  ]) assert.equal((await serve(request(SOLAR, headers))).status, 415);
});

test("enforces route/method allowlists, rejects query parameters, and protects error responses", async () => {
  assert.equal((await serve(new Request(`${URL}?年=2026`))).status, 405);
  assert.equal((await serve(new Request(`${URL}?year=2026`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(SOLAR),
  }))).status, 400);
  for (const method of ["GET", "HEAD", "PUT", "DELETE", "OPTIONS"]) {
    const response = await serve(new Request(URL, { method }));
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), "POST");
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  }
  const missing = await serve(new Request("https://example.test/.env"));
  assert.equal(missing.status, 404);
  assert.equal(missing.headers.get("x-frame-options"), "DENY");
  assert.equal(missing.headers.get("cache-control"), "no-store");
});

test("rate limits cannot be bypassed with spoofed forwarding headers and refill predictably", async () => {
  let milliseconds = 0;
  const guard = new RequestGuard({ perMinute: 60, burst: 1, now: () => milliseconds });
  const options = { guard };
  assert.equal((await serve(request(SOLAR), options)).status, 200);
  const blocked = await serve(request(SOLAR, { "x-forwarded-for": "192.0.2.1", "cf-connecting-ip": "192.0.2.2" }), options);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get("retry-after"), "1");
  milliseconds = 1000;
  assert.equal((await serve(request(SOLAR), options)).status, 200);
});

test("caps concurrent streamed requests and releases permits after validation errors", async () => {
  const guard = new RequestGuard({ maxConcurrent: 1 });
  let controller;
  const pending = serve(request(new ReadableStream({ start(value) { controller = value; } }), {}, { duplex: "half" }), { guard });
  const busy = await serve(request(SOLAR), { guard });
  assert.equal(busy.status, 503);
  controller.enqueue(new TextEncoder().encode("{}"));
  controller.close();
  assert.equal((await pending).status, 400);
  assert.equal((await serve(request(SOLAR), { guard })).status, 200);
});

test("honors Cloudflare's shared limiter and fails closed when its binding is missing", async () => {
  let key;
  const limited = await serve(request(SOLAR), { rateLimiter: { async limit(value) { key = value.key; return { success: false }; } } });
  assert.equal(limited.status, 429);
  assert.equal(key, "almanac-api");
  assert.equal((await worker.fetch(request(SOLAR), {})).status, 503);
});

test("times out a stalled body and releases the concurrency permit", { timeout: 7000 }, async () => {
  const guard = new RequestGuard({ maxConcurrent: 1 });
  let canceled = false;
  const response = await serve(request(new ReadableStream({ cancel() { canceled = true; } }), {}, { duplex: "half" }), { guard });
  assert.equal(response.status, 408);
  assert.equal(canceled, true);
  assert.equal((await serve(request(SOLAR), { guard })).status, 200);
});
