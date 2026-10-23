import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addCoreGods, coreGodHits } from "../src/god-rules.js";
import { cycleFromIndex, BRANCHES } from "../src/calendar.js";
import { calculateAuditableAlmanac } from "../src/engine.js";

const fixture = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/volume06-month-gods.json", import.meta.url)));
const almanac = (good, officer = "平") => ({ gods: { auspicious: good, inauspicious: [] }, dayOfficer: { name: officer } });
const hits = (names, officer = "平", month = 2) => coreGodHits(cycleFromIndex(month), cycleFromIndex(0), almanac(names, officer));

test("volume six monthly starts match the independent branch transcription for all 12 by 60 combinations", () => {
  for (let ordinal = 0; ordinal < 12; ordinal++) for (let index = 0; index < 60; index++) {
    const month = cycleFromIndex((ordinal + 2) % 12), day = cycleFromIndex(index), good = [], bad = [];
    addCoreGods(good, bad, month, day);
    for (const [name, rows] of Object.entries(fixture.starts)) {
      assert.equal(good.includes(name), rows[ordinal].includes(BRANCHES[day.branchIndex]), `${ordinal+1}月 ${day.name} ${name}`);
    }
  }
});

test("the nine deities keep the final restricted ritual uses, and horses do not inherit the rejected old uses", () => {
  for (const [name, expected] of Object.entries(fixture.finalActivities)) {
    const base = hits([name]).find(hit => hit.ruleId.startsWith("CLASSICAL_RAW_"));
    assert.deepEqual(base.recommends, expected, name);
    assert.deepEqual(base.avoids, [], name);
  }
});

test("warehouse and horse combinations require the particular accompanying god or officer", () => {
  const combined = (names, officer, month) => hits(names, officer, month).filter(hit => hit.ruleId.includes("_COMBINATION_"));
  assert.deepEqual(combined(["天仓", "时德"]), []);
  assert.ok(combined(["天仓", "四相"]).some(h => h.recommends.includes("修仓库")));
  assert.ok(combined(["天仓"], "开").some(h => h.recommends.includes("修仓库")));
  assert.ok(combined(["五富", "时德"]).some(h => h.recommends.includes("修仓库")));
  assert.deepEqual(combined(["驿马", "天德"]), []);
  assert.ok(combined(["驿马", "天恩"]).some(h => h.recommends.includes("颁诏")));
  assert.ok(combined(["天马", "月恩"]).some(h => h.recommends.includes("招贤")));
  assert.ok(combined(["天马"], "除", 11).some(h => h.recommends.includes("招贤")));
  assert.deepEqual(combined(["天马"], "除", 10), []);
  assert.ok(combined(["天马"], "成", 6).some(h => h.recommends.includes("招贤")));
  assert.deepEqual(combined(["天马"], "成", 7), []);
});

test("the source spelling of moving house cannot bypass the existing month-break taboo", () => {
  let cases = 0;
  for (let t = Date.parse("2024-01-01T04:00:00Z"); t < Date.parse("2025-01-01T04:00:00Z"); t += 86400000) {
    const { result, audit } = calculateAuditableAlmanac(new Date(t));
    for (const hit of audit.ruleHits.filter(h => ["驿马", "天马"].includes(h.name))) {
      assert.ok(!hit.recommends.includes("般移"));
    }
    if (result.凶煞.includes("月破") && result.吉神.includes("驿马") && !result.凶煞.includes("无禄")) {
      assert.ok(!result.宜忌.宜.includes("搬移"));
      assert.ok(result.宜忌.忌.includes("搬移")); cases++;
    }
  }
  assert.ok(cases > 0);
  const virtueCase = calculateAuditableAlmanac(new Date("2024-05-11T04:00:00Z")).result;
  assert.equal(virtueCase.宜忌.有德神, "是");
  assert.ok(virtueCase.吉神.includes("驿马"));
  assert.ok(virtueCase.宜忌.忌.includes("搬移"));
  assert.ok(!virtueCase.宜忌.宜.includes("搬移"));
});
