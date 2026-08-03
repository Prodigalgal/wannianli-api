import assert from "node:assert/strict";

const urls = process.argv.slice(2);
if (urls.length < 2) {
  throw new Error("usage: node tools/compare-current.mjs <url> <url> [url...]");
}

function normalize(value) {
  const copy = structuredClone(value);
  delete copy["当前时间"];
  copy["农历"]["天文朔时刻"] = new Date(copy["农历"]["天文朔时刻"]).toISOString();
  for (const key of ["前一节气", "下一节气"]) {
    copy["节气"][key]["交节时刻"] = new Date(copy["节气"][key]["交节时刻"]).toISOString();
  }
  return copy;
}

const responses = await Promise.all(urls.map(async (url) => {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  assert.match(response.headers.get("content-type") ?? "", /^application\/json/i, `${url}: content type`);
  return normalize(await response.json());
}));

for (let index = 1; index < responses.length; index++) {
  assert.deepEqual(responses[index], responses[0], `${urls[index]} differs from ${urls[0]}`);
}

console.log(JSON.stringify({ "对比服务数": urls.length, "结果": "完全一致（忽略请求时刻）" }, null, 2));
