import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

import { SOLAR_TERM, solarTermInstant, utcPlus8CivilDate } from "../src/astronomy.js";
import { calculateChineseCalendar } from "../src/calendar.js";
import { calculateAuditableAlmanac, calculateCurrentAlmanac } from "../src/engine.js";
import { handleRequest } from "../src/index.js";

const FIXED_NOW = new Date("2026-08-03T04:00:00Z");
const nowProvider = () => new Date(FIXED_NOW);

function collectKeysAndBooleanValues(value, keys = new Set(), booleans = []) {
  if (typeof value === "boolean") booleans.push(value);
  if (Array.isArray(value)) {
    for (const child of value) collectKeysAndBooleanValues(child, keys, booleans);
  } else if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      collectKeysAndBooleanValues(child, keys, booleans);
    }
  }
  return { keys, booleans };
}

test("calculates the fixed 2026-08-03 result independently", () => {
  const value = calculateCurrentAlmanac(FIXED_NOW);
  assert.deepEqual(value["农历"], {
    "年": 2026,
    "月": 6,
    "日": 21,
    "是否闰月": "否",
    "本月天数": 30,
    "中文日期": "二〇二六年六月廿一",
    "月朔日期": "2026-07-14",
    "天文朔时刻": "2026-07-14T09:43:27.864Z",
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(value["四柱"]).map(([key, pillar]) => [key, pillar["干支"]])),
    { "年柱": "丙午", "月柱": "乙未", "日柱": "己酉", "时柱": "庚午" },
  );
  assert.equal(value["生肖"], "马");
  assert.equal(value["季节"], "夏季");
  assert.equal(value["节气"]["当前节气"], "大暑");
  assert.equal(value["节气"]["节气第几天"], 12);
  assert.equal(value["节气"]["距下个节气天数"], 4);
  assert.deepEqual(value["三伏"], {
    "是否在期内": "是", "名称": "中伏", "第几天": 10, "总天数": 20,
    "开始日期": "2026-07-25", "结束日期": "2026-08-13", "描述": "中伏第10天，共20天",
  });
  assert.deepEqual(value["建除十二神"], { "名称": "满", "通常吉凶": "通常为凶" });
  assert.deepEqual(value["黄黑道十二值神"], { "值神": "勾陈", "黄黑道": "黑道", "吉凶": "凶" });
  assert.deepEqual(value["吉神"], ["月德合", "天德合", "天巫", "福德"]);
  assert.deepEqual(value["凶煞"], ["天狗", "灾煞", "天火"]);
  assert.equal(value["胎神"], "占大门外东北");
  assert.equal(value["二十八宿"]["全名"], "危月燕");
  assert.equal(value["冲煞"]["冲煞"], "冲兔（癸卯），煞东");
  assert.equal(value["宜忌"]["宜"].length, 48);
  assert.equal(value["宜忌"]["忌"].length, 10);
  assert.ok(value["宜忌"]["宜"].includes("开市"));
  assert.ok(value["宜忌"]["宜"].includes("交易"));
  assert.ok(value["宜忌"]["宜"].includes("纳财"));
  assert.ok(value["宜忌"]["忌"].includes("求医"));
  assert.ok(value["宜忌"]["忌"].includes("疗病"));
  assert.deepEqual(value["宜忌"]["宜"].filter((item) => value["宜忌"]["忌"].includes(item)), []);
});

test("uses Chinese-only public keys and Chinese boolean strings", () => {
  const value = calculateCurrentAlmanac(FIXED_NOW);
  const { keys, booleans } = collectKeysAndBooleanValues(value);
  assert.equal(booleans.length, 0);
  assert.ok(keys.size >= 70);
  for (const key of keys) assert.match(key, /^\p{Script=Han}+$/u);
  assert.equal(value["农历"]["是否闰月"], "否");
  assert.equal(value["三伏"]["是否在期内"], "是");
  assert.equal(value["数九"]["主结果"]["是否在期内"], "否");
  assert.equal(value["宜忌"]["有德神"], "是");
  assert.equal(value["宜忌"]["诸事皆忌"], "否");
  assert.equal(JSON.stringify(value).includes("日本"), false);
  assert.equal(JSON.stringify(value).includes("佛历"), false);
});

test("calculates the 2020 leap fourth month civil-day boundary", () => {
  const regular = calculateChineseCalendar("2020-04-23");
  const leap = calculateChineseCalendar("2020-05-23");
  assert.deepEqual([regular.month, regular.day, regular.leapMonth], [4, 1, false]);
  assert.deepEqual([leap.month, leap.day, leap.leapMonth], [4, 1, true]);
});

test("matches authoritative lunar new year dates from 2020 through 2030", () => {
  const newYears = [
    "2020-01-25", "2021-02-12", "2022-02-01", "2023-01-22", "2024-02-10", "2025-01-29",
    "2026-02-17", "2027-02-06", "2028-01-26", "2029-02-13", "2030-02-03",
  ];
  for (const date of newYears) {
    const lunar = calculateChineseCalendar(date);
    assert.deepEqual([lunar.month, lunar.day, lunar.leapMonth], [1, 1, false], date);
  }
});

test("places the validated 2026 solar terms on the expected UTC+8 dates", () => {
  assert.equal(utcPlus8CivilDate(solarTermInstant(2026, SOLAR_TERM.MAJOR_HEAT)), "2026-07-23");
  assert.equal(utcPlus8CivilDate(solarTermInstant(2026, SOLAR_TERM.START_OF_AUTUMN)), "2026-08-07");
  assert.equal(utcPlus8CivilDate(solarTermInstant(2026, SOLAR_TERM.END_OF_HEAT)), "2026-08-23");
});

test("retains auditable source IDs and the canonical disaster-sha exception", () => {
  const { result, audit } = calculateAuditableAlmanac(FIXED_NOW);
  const allowedSources = new Set([
    "XIEJI_BIANFANGSHU_VOLUME_10", "XIEJI_BIANFANGSHU_VOLUME_7", "YUXIAJI_TRADITION",
  ]);
  assert.ok(audit.ruleHits.length >= 7);
  assert.ok(audit.ruleHits.every((hit) => allowedSources.has(hit.sourceId)));
  assert.ok(audit.ruleHits.every((hit) => hit.matchedBecause.length > 0 && hit.note.length > 0));
  const retained = audit.ruleHits.find((hit) => hit.ruleId === "DISASTER_SHA_RETAINED_TABOOS");
  assert.ok(retained);
  assert.deepEqual(retained.avoids, ["安抚边境", "选将", "训兵", "出师", "求医", "疗病"]);
  const medical = audit.activityDecisions.find((decision) => decision.activity === "求医");
  assert.equal(medical.disposition, "AVOID");
  assert.match(medical.rationale, /专例明确保留/);
  assert.equal(Object.hasOwn(result, "审计"), false);
  assert.equal(Object.hasOwn(result, "文献"), false);
});

test("serves root and API path without an origin subrequest", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("outbound request attempted"); };
  try {
    for (const path of ["/", "/api/v1/almanac/current"]) {
      const response = await handleRequest(new Request(`https://wannianli-worker.mnnu.eu.org${path}`), nowProvider);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal(response.headers.get("x-wannianli-runtime"), "cloudflare-worker-standalone");
      assert.equal((await response.json())["农历"]["中文日期"], "二〇二六年六月廿一");
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("returns empty HEAD responses and rejects unsupported requests", async () => {
  const head = await handleRequest(new Request("https://wannianli-worker.mnnu.eu.org/", { method: "HEAD" }), nowProvider);
  assert.equal(head.status, 200);
  assert.equal(await head.text(), "");
  assert.equal(head.headers.get("x-wannianli-runtime"), "cloudflare-worker-standalone");

  const missing = await handleRequest(new Request("https://wannianli-worker.mnnu.eu.org/other"), nowProvider);
  assert.equal(missing.status, 404);
  const method = await handleRequest(new Request("https://wannianli-worker.mnnu.eu.org/", { method: "POST" }), nowProvider);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get("allow"), "GET, HEAD");
});

test("runtime source contains no origin URL, service binding, or outbound request call", async () => {
  const files = (await readdir(new URL("../src/", import.meta.url))).filter((name) => name.endsWith(".js"));
  const source = (await Promise.all(files.map((name) => readFile(new URL(`../src/${name}`, import.meta.url), "utf8")))).join("\n");
  assert.doesNotMatch(source, /ORIGIN_URL|wannianli-direct|service_binding/i);
  assert.doesNotMatch(source, /(?:await|return)\s+(?:globalThis\.)?fetch\s*\(/);
});
