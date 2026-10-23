import assert from "node:assert/strict";
import test from "node:test";
import { SOLAR_TERM, SOLAR_TERMS, longitudeAt, mod, solarTermInstant } from "../src/astronomy.js";
import { calculateChineseCalendar, calculatePillars, lunarToGregorian } from "../src/calendar.js";
import { calculateCurrentAlmanac } from "../src/engine.js";

test("round-trips lunar leap months, cross-year dates, and both support boundaries", () => {
  const cases = [
    ["1801-01-01", 1800, 11, 17, false], ["1801-02-13", 1801, 1, 1, false],
    ["2014-12-22", 2014, 11, 1, false], ["2020-04-23", 2020, 4, 1, false],
    ["2020-05-23", 2020, 4, 1, true], ["2026-08-03", 2026, 6, 21, false],
    ["2033-11-22", 2033, 11, 1, false], ["2033-12-22", 2033, 11, 1, true],
    ["2034-01-20", 2033, 12, 1, false], ["2034-02-19", 2034, 1, 1, false],
    ["2199-12-31", 2199, 11, 14, false],
  ];
  for (const [date, year, month, day, leap] of cases) {
    const actual = calculateChineseCalendar(date);
    assert.deepEqual([actual.year, actual.month, actual.day, actual.leapMonth], [year, month, day, leap], date);
    assert.equal(lunarToGregorian(year, month, day, leap), date);
  }
  assert.throws(() => lunarToGregorian(2026, 2, 30), /只有29天/u);
  assert.throws(() => lunarToGregorian(2026, 4, 1, true), /月份不存在/u);
  assert.throws(() => lunarToGregorian(2199, 12, 1), /对应公历日期/u);
});

test("solar-term instants agree with year/month pillars and seasons at the exact millisecond", () => {
  for (const term of SOLAR_TERMS) {
    const at = solarTermInstant(2026, term);
    const before = new Date(at.getTime() - 1);
    const signedDistance = (date) => mod(longitudeAt(date) - term.longitude + 180, 360) - 180;
    assert.ok(signedDistance(before) < 0, `${term.name}: before`);
    assert.ok(signedDistance(at) >= 0, `${term.name}: at`);
    const previous = calculateCurrentAlmanac(before);
    const next = calculateCurrentAlmanac(at);
    assert.equal(next["节气"]["当前节气"], term.name);
    if (mod(term.longitude - 315, 30) === 0) {
      assert.notEqual(previous["四柱"]["月柱"]["干支"], next["四柱"]["月柱"]["干支"], term.name);
    } else {
      assert.equal(previous["四柱"]["月柱"]["干支"], next["四柱"]["月柱"]["干支"], term.name);
    }
    if (term === SOLAR_TERM.START_OF_SPRING) {
      assert.equal(previous["四柱"]["年柱"]["干支"], "乙巳");
      assert.equal(next["四柱"]["年柱"]["干支"], "丙午");
      assert.equal(next["四柱"]["月柱"]["干支"], "庚寅");
      assert.equal(next["季节"], "春季");
    }
  }
});

test("century leap-year arithmetic and civil-day/hour boundaries stay consistent", () => {
  for (const date of ["1900-02-28", "1900-03-01", "2000-02-29", "2100-02-28", "2100-03-01"]) {
    const lunar = calculateChineseCalendar(date);
    assert.equal(lunarToGregorian(lunar.year, lunar.month, lunar.day, lunar.leapMonth), date);
  }
  const late = calculateCurrentAlmanac(new Date("2026-08-03T15:59:59Z"));
  const midnight = calculateCurrentAlmanac(new Date("2026-08-03T16:00:00Z"));
  assert.equal(late["四柱"]["日柱"]["干支"], "己酉");
  assert.equal(midnight["四柱"]["日柱"]["干支"], "庚戌");
  const beforeHour = calculatePillars(new Date("2026-08-03T04:59:59Z"), "2026-08-03");
  const afterHour = calculatePillars(new Date("2026-08-03T05:00:00Z"), "2026-08-03");
  assert.equal(beforeHour.hour.name, "庚午");
  assert.equal(afterHour.hour.name, "辛未");
});
