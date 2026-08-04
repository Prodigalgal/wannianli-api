import assert from "node:assert/strict";

import { BRANCHES, calculateChineseCalendar, calculateXunKong, cycleFromIndex } from "../worker/src/calendar.js";
import { calculateCurrentAlmanac } from "../worker/src/engine.js";

const DAY_MS = 86_400_000;
const first = Date.UTC(1801, 0, 1);
const last = Date.UTC(2199, 11, 31);
const cyclesByName = new Map(Array.from({ length: 60 }, (_, index) => {
  const cycle = cycleFromIndex(index);
  return [cycle.name, cycle];
}));

function civilDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function assertNoBoolean(value) {
  if (typeof value === "boolean") {
    assert.fail("public result contains a raw boolean");
  }
  if (Array.isArray(value)) {
    value.forEach(assertNoBoolean);
  } else if (value !== null && typeof value === "object") {
    Object.values(value).forEach(assertNoBoolean);
  }
}

let previous;
let previousDate;
let days = 0;
let monthStarts = 0;
let leapMonthStarts = 0;
let fullResults = 0;

for (let timestamp = first; timestamp <= last; timestamp += DAY_MS) {
  const date = civilDate(timestamp);
  const lunar = calculateChineseCalendar(date);
  assert.ok(lunar.month >= 1 && lunar.month <= 12, `${date}: lunar month`);
  assert.ok(lunar.day >= 1 && lunar.day <= lunar.daysInMonth, `${date}: lunar day`);
  assert.ok(lunar.daysInMonth === 29 || lunar.daysInMonth === 30, `${date}: month length`);

  if (previous) {
    if (lunar.monthStartDate === previous.monthStartDate) {
      assert.equal(lunar.day, previous.day + 1, `${date}: day continuity`);
      assert.equal(lunar.month, previous.month, `${date}: month continuity`);
      assert.equal(lunar.leapMonth, previous.leapMonth, `${date}: leap continuity`);
      assert.equal(lunar.year, previous.year, `${date}: year continuity`);
    } else {
      assert.equal(lunar.day, 1, `${date}: new month must start at day one`);
      assert.equal(previous.day, previous.daysInMonth, `${previousDate}: previous month must end at declared length`);
      monthStarts++;
      if (lunar.leapMonth) leapMonthStarts++;
    }
  }

  if (days % 17 === 0 || timestamp === last) {
    const result = calculateCurrentAlmanac(new Date(timestamp + 4 * 3_600_000));
    assertNoBoolean(result);
    const recommended = new Set(result["宜忌"]["宜"]);
    const avoided = new Set(result["宜忌"]["忌"]);
    const caution = new Set(result["宜忌"]["宜忌并存"]);
    for (const activity of recommended) {
      assert.ok(!avoided.has(activity) && !caution.has(activity), `${date}: duplicate recommended activity`);
    }
    for (const activity of avoided) {
      assert.ok(!caution.has(activity), `${date}: duplicate avoided activity`);
    }
    for (const pillar of Object.values(result["四柱"])) {
      assert.equal([...pillar["干支"]].length, 2, `${date}: pillar length`);
    }
    for (const pillarName of ["年柱", "月柱", "日柱", "时柱"]) {
      const cycle = cyclesByName.get(result["四柱"][pillarName]["干支"]);
      assert.ok(cycle, `${date}: ${pillarName} cycle`);
      const expected = calculateXunKong(cycle);
      const actual = result["旬空"][pillarName];
      assert.equal(actual["所属旬"], expected.xunName, `${date}: ${pillarName} xun`);
      assert.deepEqual(actual["空亡"], expected.emptyBranches, `${date}: ${pillarName} empty branches`);
      assert.equal(new Set(actual["空亡"]).size, 2, `${date}: ${pillarName} distinct empty branches`);
      assert.ok(actual["空亡"].every((branch) => BRANCHES.includes(branch)), `${date}: ${pillarName} valid branches`);
    }
    assert.ok(!JSON.stringify(result).includes("日本"), `${date}: Japanese era leaked`);
    fullResults++;
  }

  previous = lunar;
  previousDate = date;
  days++;
}

console.log(JSON.stringify({
  "开始日期": civilDate(first),
  "结束日期": civilDate(last),
  "逐日农历校验数": days,
  "检测月首数": monthStarts,
  "检测闰月首数": leapMonthStarts,
  "完整结果抽样数": fullResults,
  "结果": "通过",
}, null, 2));
