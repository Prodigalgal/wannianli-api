import assert from "node:assert/strict";
import { handleRequest } from "../worker/src/index.js";
import { RequestGuard } from "../worker/src/security.js";

const base = process.argv[2] ?? "http://127.0.0.1:18081";
const path = "/api/v1/almanac/calculate";
const cases = [
  [1801, 1, 1], [2199, 12, 31], [1900, 2, 28], [2000, 2, 29], [2100, 3, 1],
  [2014, 12, 22], [2020, 2, 23], [2020, 5, 23], [2026, 2, 4], [2026, 8, 7],
  [2033, 12, 22], [2034, 2, 19], [2057, 9, 28], [2097, 8, 7],
].map(([year, month, day]) => ({ "历法": "公历", "年": year, "月": month, "日": day, "时": 12, "分": 34, "秒": 56 }));
cases.push({ "历法": "农历", "年": 2020, "月": 4, "日": 1, "是否闰月": "是", "时": 23, "分": 59, "秒": 59 });
cases.push({ "历法": "农历", "年": 2033, "月": 11, "日": 1, "是否闰月": "是" });
function normalize(value) {
  value["当前时间"] = new Date(value["当前时间"]).toISOString();
  value["农历"]["天文朔时刻"] = new Date(value["农历"]["天文朔时刻"]).toISOString();
  for (const key of ["前一节气", "下一节气"]) value["节气"][key]["交节时刻"] = new Date(value["节气"][key]["交节时刻"]).toISOString();
  return value;
}
let checked = 0;
for (const input of cases) {
  const init = { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) };
  const actual = await fetch(new URL(path, base), init);
  assert.equal(actual.status, 200, `${JSON.stringify(input)}: HTTP ${actual.status}`);
  const expected = await handleRequest(new Request(`https://worker.test${path}`, init), undefined,
    { guard: new RequestGuard() });
  assert.equal(expected.status, 200);
  assert.deepEqual(normalize(await actual.json()), normalize(await expected.json()), JSON.stringify(input));
  checked++;
}
console.log(JSON.stringify({ cases: checked, result: "Java HTTP and Worker public calculations match exactly after ISO timestamp normalization" }));
