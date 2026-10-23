import assert from "node:assert/strict";
import test from "node:test";
import { addCivilDays, deltaTSeconds, instantFromUtcPlus8, SOLAR_TERM, solarTermInstant, utcPlus8CivilDate } from "../src/astronomy.js";
import { cycleFromIndex, isEarthReign } from "../src/calendar.js";
import { calculateTraditionalAlmanac } from "../src/almanac.js";
import { calculateAuditableAlmanac, calculateCurrentAlmanac } from "../src/engine.js";
import { evaluateActivities } from "../src/rules.js";
import { noSalaryAllowed } from "../src/god-rules.js";

test("no month-break taboo becomes recommended anywhere in 2020-2030, with or without virtues", () => {
  let brokenDays = 0, withVirtue = 0, checkedTaboos = 0;
  for (let date = "2020-01-01"; date <= "2030-12-31"; date = addCivilDays(date, 1)) {
    const value = calculateAuditableAlmanac(new Date(`${date}T04:00:00Z`));
    const hit = value.audit.ruleHits.find((rule) => rule.ruleId === "OFFICER_破");
    if (!hit) continue;
    brokenDays++;
    if (value.result["宜忌"]["有德神"] === "是") withVirtue++;
    for (const activity of hit.avoids) {
      const decision = value.audit.activityDecisions.find(d => d.activity === activity);
      assert.ok(decision.avoidedBy.includes("OFFICER_破"), `${date}: lost original taboo ${activity}`);
      if (value.result.凶煞.includes("无禄") && !noSalaryAllowed.includes(activity)) {
        assert.equal(decision.disposition, "OMITTED", `${date}: restricted annotation ${activity}`);
      } else assert.ok(value.result["宜忌"]["忌"].includes(activity), `${date}: lost taboo ${activity}`);
      assert.ok(!value.result["宜忌"]["宜"].includes(activity), `${date}: reversed taboo ${activity}`);
      checkedTaboos++;
    }
  }
  assert.equal(brokenDays, 333);
  assert.equal(withVirtue, 89);
  assert.ok(checkedTaboos > 18000);
});

test("four seasonal earth periods include exactly 18 civil days and add, rather than replace, maternal storehouse", () => {
  for (const term of [SOLAR_TERM.START_OF_SPRING, SOLAR_TERM.START_OF_SUMMER, SOLAR_TERM.START_OF_AUTUMN, SOLAR_TERM.START_OF_WINTER]) {
    const end = utcPlus8CivilDate(solarTermInstant(2026, term));
    assert.equal(isEarthReign(addCivilDays(end, -19)), false);
    assert.equal(isEarthReign(end), false);
    for (let offset = -18; offset < 0; offset++) {
      const date = addCivilDays(end, offset);
      assert.equal(isEarthReign(date), true);
      const value = calculateCurrentAlmanac(new Date(`${date}T04:00:00Z`));
      assert.ok(value["凶煞"].includes("土王用事"));
      if (["巳", "午"].includes(value["四柱"]["日柱"]["地支"])) assert.ok(value["吉神"].includes("母仓"));
      if (term === SOLAR_TERM.START_OF_SUMMER && ["亥", "子"].includes(value["四柱"]["日柱"]["地支"])) {
        assert.ok(value["吉神"].includes("母仓"), "retain the spring maternal-storehouse branches");
      }
      assert.ok(!value["宜忌"]["宜"].includes("兴造动土"));
      assert.ok(!value["宜忌"]["宜"].includes("塞穴"));
    }
  }
});

test("uses retained officer aliases while excluding daily guanfu and branch-virtue rejected by the author's notes", () => {
  for (let branch = 0; branch < 12; branch++) {
    const month = cycleFromIndex(branch);
    const get = (offset) => calculateTraditionalAlmanac("2026-06-10", month, cycleFromIndex(branch + offset), 80);
    assert.ok(get(0).gods.inauspicious.includes("小时"));
    assert.ok(get(0).gods.inauspicious.includes("土府"));
    assert.ok(get(4).gods.inauspicious.includes("死气"));
    assert.ok(!get(4).gods.inauspicious.includes("官符"));
    assert.ok(get(5).gods.inauspicious.includes("小耗"));
    assert.ok(!get(5).gods.auspicious.includes("枝德"));
    assert.ok(get(3).gods.inauspicious.includes(branch % 2 === 0 ? "天罡" : "河魁"));
    assert.ok(get(9).gods.inauspicious.includes(branch % 2 === 0 ? "河魁" : "天罡"));
  }
  const value = calculateTraditionalAlmanac("2026-02-10", cycleFromIndex(2), cycleFromIndex(53), 320);
  assert.equal(value.dutyGod.name, "宝光");
  assert.ok(value.gods.auspicious.includes("天德"));
});

test("pardon suppresses another god's military recommendation; full-day medical editorial decision is recorded", () => {
  const month = cycleFromIndex(5), day = cycleFromIndex(30);
  const almanac = calculateTraditionalAlmanac("2026-06-10", month, day, 80);
  assert.ok(almanac.gods.auspicious.includes("天赦"));
  const result = evaluateActivities("2026-06-10", month, day, almanac, 80);
  assert.ok(result.ruleHits.find((hit) => hit.ruleId === "OFFICER_除").recommends.includes("出师"));
  assert.ok(!result.recommended.includes("出师"));
  const fullDay = calculateAuditableAlmanac(new Date("2026-08-03T04:00:00Z"));
  assert.match(fullDay.audit.ruleHits.find((hit) => hit.ruleId === "OFFICER_满").note, /卷四.*卷十.*删除/u);
});

test("civil period day 16 and zero days until today's next term are compatible", () => {
  const value = calculateCurrentAlmanac(instantFromUtcPlus8(2026, 8, 7, 12));
  assert.equal(value["节气"]["当前节气"], "大暑");
  assert.equal(value["节气"]["今日交节"], "立秋");
  assert.equal(value["节气"]["节气第几天"], 16);
  assert.equal(value["节气"]["距下个节气天数"], 0);
});

test("observed Delta T matches USNO anchors and rejects non-finite or unsupported arguments", () => {
  assert.equal(deltaTSeconds(2024), 69.1752);
  assert.equal(deltaTSeconds(2025), 69.1377);
  assert.equal(deltaTSeconds(2026), 69.1099);
  for (const year of [NaN, Infinity, 1799.9, 2202.1]) assert.throws(() => deltaTSeconds(year), RangeError);
  assert.ok(Number.isFinite(deltaTSeconds(2201.1)));
  for (const year of [1799, 2201]) assert.throws(() => solarTermInstant(year, SOLAR_TERM.WINTER_SOLSTICE), RangeError);
});
