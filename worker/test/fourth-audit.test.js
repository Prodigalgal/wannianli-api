import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { calculateAuditableAlmanac } from "../src/engine.js";
import { addCoreGods, isNoSalary, noSalaryAllowed } from "../src/god-rules.js";
import { cycleFromIndex } from "../src/calendar.js";
import { absoluteCase, pressingCase, universalRelief } from "../src/classical.js";
import { solarTermInstant, SOLAR_TERM } from "../src/astronomy.js";

const fixture = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/classical-second-batch.json", import.meta.url), "utf8"));
const at = date => calculateAuditableAlmanac(new Date(date + "T04:00:00Z"));

test("second monthly batch follows the named source conditions and absolute exceptions take precedence", () => {
  for (const [date, grade] of fixture.monthly) assert.equal(at(date).result.宜忌.日等, grade, date);
  for (const date of fixture.absolute) {
    const value = at(date).result.宜忌;
    assert.equal(value.日等, "最下"); assert.equal(value.诸事皆忌, "是"); assert.deepEqual(value.宜, []);
  }
  // A heavenly virtue does not substitute for the specific month virtue/combination in the robbery clause.
  assert.equal(at("2020-01-03").result.宜忌.有德神, "是");
  assert.ok(at("2020-01-03").result.宜忌.忌.includes("祈福"));
});

test("barking tables use the author's corrected thirteen and eleven days, and five day classes partition the cycle", () => {
  const barking = [], opposite = [], counts = Object.fromEntries(["宝日", "义日", "制日", "专日", "伐日"].map(name => [name, 0]));
  for (let i = 0; i < 60; i++) {
    const day = cycleFromIndex(i), good = [], bad = [];
    addCoreGods(good, bad, cycleFromIndex(2), day);
    if (good.includes("鸣吠")) barking.push(day.name);
    if (good.includes("鸣吠对")) opposite.push(day.name);
    const classes = Object.keys(counts).filter(name => [...good, ...bad].includes(name));
    assert.equal(classes.length, 1, day.name); counts[classes[0]]++;
  }
  assert.deepEqual(barking.sort(), [...fixture.barking].sort());
  assert.deepEqual(opposite.sort(), [...fixture.barkingOpposite].sort());
  assert.ok(Object.values(counts).every(n => n === 12));
});

test("eight winds use the final editorial starts rather than the quoted older table", () => {
  const names = (month, name) => {
    const good = [], bad = [];
    const day = Array.from({ length: 60 }, (_, i) => cycleFromIndex(i)).find(day => day.name === name);
    addCoreGods(good, bad, cycleFromIndex(month), day); return bad;
  };
  assert.ok(names(2, "丁巳").includes("八风"));
  assert.ok(!names(2, "己酉").includes("八风"));
  assert.ok(names(8, "丁亥").includes("八风"));
  assert.ok(!names(8, "辛未").includes("八风"));
});

test("explicit retained taboos, the eight named relief days, and pressing-day placement hold across five years", () => {
  let relieved = 0, absolute = 0, pressing = 0;
  for (let t = Date.parse("2020-01-01T04:00:00Z"); t < Date.parse("2025-01-01T04:00:00Z"); t += 86400000) {
    const { result, audit } = calculateAuditableAlmanac(new Date(t));
    const month = audit.pillars.month, day = audit.pillars.day;
    if (universalRelief(month, day)) { assert.deepEqual(result.宜忌.忌, []); relieved++; continue; }
    const noSalary = result.凶煞.includes("无禄");
    for (const hit of audit.ruleHits.filter(hit => hit.ruleId.startsWith("CLASSICAL_ACTIVE_"))) {
      for (const activity of hit.avoids) {
        if (noSalary && !noSalaryAllowed.includes(activity)) {
          assert.equal(audit.activityDecisions.find(d => d.activity === activity).disposition, "OMITTED");
        } else assert.ok(result.宜忌.忌.includes(activity), `${day.name}: ${activity}`);
      }
    }
    if (absoluteCase(month, day)) { assert.equal(result.宜忌.诸事皆忌, "是"); absolute++; }
    if (pressingCase(month, day)) {
      const row = audit.ruleHits.find(hit => hit.ruleId === "PRESSING_PLACEMENT");
      for (const activity of row.avoids) assert.ok(!result.宜忌.宜.includes(activity)); pressing++;
    }
  }
  assert.ok(relieved > 10 && absolute > 20 && pressing > 10, JSON.stringify({ relieved, absolute, pressing }));
});

test("no salary checks real filling and conjunction conditions, with Gui-Hai retained and restricted annotation", () => {
  const year = cycleFromIndex(20), month = cycleFromIndex(2), day = cycleFromIndex(8);
  assert.equal(isNoSalary(year, month, day, 329.999, ["天德合"]), true);
  assert.equal(isNoSalary(year, month, day, 330, ["天德合"]), false);
  assert.equal(isNoSalary(year, month, day, 329.999, ["月德"]), false);
  assert.equal(isNoSalary(cycleFromIndex(8), month, day, 329.999, []), false);
  assert.equal(isNoSalary(cycleFromIndex(59), cycleFromIndex(59), cycleFromIndex(59), 300, ["天德", "月德"]), true);
  for (const [year, term] of [[2024, SOLAR_TERM.MAJOR_HEAT], [2039, SOLAR_TERM.RAIN_WATER]]) {
    const instant = solarTermInstant(year, term);
    assert.ok(calculateAuditableAlmanac(new Date(+instant - 1)).result.凶煞.includes("无禄"));
    assert.ok(!calculateAuditableAlmanac(instant).result.凶煞.includes("无禄"));
  }
  let found = 0;
  for (let t = Date.parse("2024-01-01T04:00:00Z"); t < Date.parse("2025-01-01T04:00:00Z"); t += 86400000) {
    const value = calculateAuditableAlmanac(new Date(t)).result;
    if (value.凶煞.includes("无禄")) { for (const key of ["宜", "忌", "宜忌并存"]) assert.ok(value.宜忌[key].every(a => noSalaryAllowed.includes(a))); found++; }
  }
  assert.ok(found > 10);
});

test("month aversion changes proclamation to administration and the two June error days retain their own taboos", () => {
  const changed = at("2020-01-09").result.宜忌;
  assert.ok(changed.宜.includes("布政事")); assert.ok(!changed.宜.includes("宣政事"));
  for (const activity of ["颁诏", "施恩封拜", "诏命公卿", "招贤", "举正直"]) assert.ok(!changed.宜.includes(activity));
  for (const date of ["2020-07-15", "2020-07-25"]) {
    const value = at(date).result.宜忌;
    assert.equal(value.有德神, "是"); assert.ok(value.忌.includes("求医")); assert.ok(value.忌.includes("安葬"));
  }
});
