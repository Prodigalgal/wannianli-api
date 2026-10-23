import assert from "node:assert/strict";
import test from "node:test";
import { calendarFixture as fixture } from "../test-support/calendar-source.js";
import { calendarDayRules } from "../src/calendar-day-rules.js";
import { calculateChineseCalendar } from "../src/calendar.js";
import { addCivilDays } from "../src/astronomy.js";
import { calculateAuditableAlmanac } from "../src/engine.js";
import { contract } from "../src/semantic.js";

const at = (date,time="12:00:00") => calculateAuditableAlmanac(new Date(date+"T"+time+"+08:00"));
const rules = date => calendarDayRules(date,calculateChineseCalendar(date));
const decision = (value,activity) => value.audit.activityDecisions.find(d => d.activity === activity);

test("public annotation policies match the independently transcribed source lists", () => {
  const { monthlyTaboo, equinoxSolstice } = contract.capabilities.annotationPolicies;
  assert.equal(monthlyTaboo.triggerGod,"月忌日");
  assert.deepEqual(monthlyTaboo.lunarDays,[5,14,23]);
  assert.deepEqual(monthlyTaboo.allowedActivities,fixture.monthlyAllowed);
  assert.deepEqual(equinoxSolstice.triggerGods,Object.values(fixture.termDates2026));
  assert.deepEqual(equinoxSolstice.omittedActivities,fixture.termOmissions);
  assert.deepEqual(equinoxSolstice.winterAdditionalOmissions,["伐木"]);
});

test("qi going loss follows twelve independently recorded inclusive dates, rather than adding one extra day", () => {
  for (const date of fixture.qiGoingLoss2026) {
    assert.ok(rules(date).names.includes("气往亡"),date);
    assert.ok(!rules(addCivilDays(date,-1)).names.includes("气往亡"),date+" previous");
    assert.ok(!rules(addCivilDays(date,1)).names.includes("气往亡"),date+" next");
    assert.deepEqual(rules(date).hits.find(h=>h.name==="气往亡").avoids,fixture.qiAvoids);
  }
});

test("reversed branch uses all twelve supplied new-moon branches, including a real virtue conjunction", () => {
  // These supplied month starts are controlled branch inputs, not claims of twelve real consecutive lunar months.
  for (const [start,branch,expected] of fixture.reversedBranchCases) for(let day=1;day<=7;day++) {
    const result=calendarDayRules(addCivilDays(start,day-1),{monthStartDate:start,day,leapMonth:false});
    assert.equal(result.names.includes("反支"),day===expected,`${branch}朔 第${day}日`);
  }
  const value=at("2026-02-17");
  assert.equal(value.result.农历.日,1);assert.equal(value.result.四柱.日柱.地支,"戌");
  assert.ok(value.result.凶煞.includes("反支"));assert.equal(value.result.宜忌.有德神,"是");
  assert.deepEqual(value.audit.ruleHits.find(h=>h.name==="反支").avoids,fixture.reverseAvoids);
  for(const activity of fixture.reverseAvoids) {
    assert.equal(decision(value,activity).disposition,"AVOID");
    assert.ok(decision(value,activity).avoidedBy.includes("CALENDAR_REVERSED_BRANCH_RETAINED_TABOOS"));
  }
});

test("qi going loss preserves specific taboos at a superior virtue day and transfers proclamation without its own taboo", () => {
  const value=at("2020-04-24");
  assert.ok(value.result.凶煞.includes("气往亡"));assert.ok(!value.result.凶煞.includes("往亡"));
  assert.equal(value.result.宜忌.日等,"上");assert.equal(value.result.宜忌.有德神,"是");
  for(const activity of fixture.qiAvoids) assert.equal(decision(value,activity).disposition,"AVOID",activity);
  assert.equal(decision(value,"布政事").disposition,"RECOMMENDED");
  assert.deepEqual(decision(value,"布政事").recommendedBy,decision(value,"宣政事").recommendedBy);
  assert.ok(decision(value,"布政事").avoidedBy.every(id=>!id.includes("GOING_LOSS")));
  assert.ok(!value.audit.ruleHits.find(h=>h.name==="气往亡").avoids.includes("施恩封拜"));
});

test("the four term days omit both directions for a whole civil date, with logging and an extra winter woodcutting clause", () => {
  for(const [date,name] of Object.entries(fixture.termDates2026)) {
    for(const time of ["00:00:00","23:59:59"]) {
      const value=at(date,time);assert.ok(value.result.凶煞.includes(name));
      for(const key of ["宜","忌","宜忌并存"]) for(const activity of fixture.termOmissions)
        assert.ok(!value.result.宜忌[key].includes(activity),date+" "+activity);
    }
    assert.ok(!at(addCivilDays(date,-1)).result.凶煞.includes(name));
    assert.ok(!at(addCivilDays(date,1)).result.凶煞.includes(name));
  }
  const winter=at("2024-12-21"),wood=decision(winter,"伐木");
  assert.equal(winter.result.农历.日,21);assert.ok(wood.recommendedBy.length>0);
  assert.equal(wood.disposition,"OMITTED");
  assert.ok(decision(winter,"嫁娶").avoidedBy.length>0);
  assert.equal(decision(winter,"嫁娶").disposition,"OMITTED");
  const spring=at("2024-03-20");assert.ok(decision(spring,"嫁娶").recommendedBy.length>0);
  assert.equal(decision(spring,"嫁娶").disposition,"OMITTED");
});

test("monthly taboo uses lunar days through an ordinary and a leap year, printing only the twelve final volume-ten classes", () => {
  let checked=0;
  for(const year of [2020,2024]) for(let date=`${year}-01-01`;date<`${year+1}-01-01`;date=addCivilDays(date,1)) {
    const value=at(date),isTaboo=[5,14,23].includes(value.result.农历.日);
    assert.equal(value.result.凶煞.includes("月忌日"),isTaboo,date);
    if(!isTaboo)continue;
    for(const key of ["宜","忌","宜忌并存"]) assert.ok(value.result.宜忌[key].every(a=>fixture.monthlyAllowed.includes(a)),date);
    checked++;
  }
  assert.ok(checked>=72);
  for(const [date,day] of fixture.leapMonthTaboos) {
    const value=at(date);assert.equal(value.result.农历.是否闰月,"是");assert.equal(value.result.农历.日,day);
    assert.ok(value.result.凶煞.includes("月忌日"));
  }
});

test("unprinted taboos keep raw evidence and do not become favorable, including an absolute month rule", () => {
  for(const [date,activities] of [["2024-01-04",["安床","开仓库"]],["2020-07-25",["安葬"]]]) {
    const value=at(date);assert.ok(value.result.凶煞.includes("月忌日"));
    for(const activity of activities) {
      const d=decision(value,activity);assert.ok(d.avoidedBy.length>0);assert.equal(d.disposition,"OMITTED");
      for(const key of ["宜","忌","宜忌并存"])assert.ok(!value.result.宜忌[key].includes(activity));
    }
  }
  const overlap=at("2026-02-10");
  assert.ok(overlap.result.凶煞.includes("气往亡")&&overlap.result.凶煞.includes("月忌日"));
  assert.equal(decision(overlap,"求医").disposition,"AVOID");
  assert.equal(decision(overlap,"上册进表章").disposition,"OMITTED");
});
