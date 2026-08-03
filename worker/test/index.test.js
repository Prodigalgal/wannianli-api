import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest, localizeBooleans } from "../src/index.js";

const env = {
  ORIGIN_URL: "https://origin.example/api/v1/almanac/current",
};

function successfulOrigin(body = { "是否闰月": false, "宜忌": { "有德神": true } }) {
  return async (request) => {
    assert.equal(request.url, env.ORIGIN_URL);
    assert.equal(request.headers.get("accept"), "application/json");
    return Response.json(body);
  };
}

test("recursively localizes every boolean value", () => {
  assert.deepEqual(
    localizeBooleans({ a: true, b: [false, { c: true }], d: null }),
    { a: "是", b: ["否", { c: "是" }], d: null },
  );
});

test("proxies the current almanac without caching", async () => {
  const response = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/api/v1/almanac/current"),
    env,
    successfulOrigin(),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-wannianli-runtime"), "cloudflare-worker");
  assert.deepEqual(await response.json(), {
    "是否闰月": "否",
    "宜忌": { "有德神": "是" },
  });
});

test("serves the current result from the root alias", async () => {
  const response = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/"),
    env,
    successfulOrigin(),
  );
  assert.equal(response.status, 200);
});

test("returns headers without a body for HEAD", async () => {
  const response = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/", { method: "HEAD" }),
    env,
    successfulOrigin(),
  );

  assert.equal(response.status, 200);
  assert.equal(await response.text(), "");
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("rejects unsupported paths and methods", async () => {
  const missing = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/other"),
    env,
    successfulOrigin(),
  );
  assert.equal(missing.status, 404);

  const method = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/", { method: "POST" }),
    env,
    successfulOrigin(),
  );
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD");
});

test("returns a clean Chinese error when the origin is unavailable", async () => {
  const response = await handleRequest(
    new Request("https://wannianli-worker.mnnu.eu.org/"),
    env,
    async () => {
      throw new Error("network failure");
    },
  );

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), { "错误": "源站暂时不可用" });
});
