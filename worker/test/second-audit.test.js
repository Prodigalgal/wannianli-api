import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateAuditableAlmanac } from "../src/engine.js";
import { newMoonInstant, solarTermInstant, SOLAR_TERM, SOLAR_MAX_YEAR, DELTA_T_MAX_YEAR } from "../src/astronomy.js";

const at = date => calculateAuditableAlmanac(new Date(date + "T04:00:00Z"));
test("open-day burial placement remains omitted unless another rule independently forbids it", () => {
  let checked=0;
  for(let t=Date.parse("2020-01-01T04:00:00Z");t<Date.parse("2025-01-01T04:00:00Z");t+=86400000){
    const {result,audit}=calculateAuditableAlmanac(new Date(t));
    if(result.建除十二神.名称!=="开")continue;
    for(const activity of ["破土","安葬","启攒"]){
      assert.ok(!result.宜忌.宜.includes(activity));
      const d=audit.activityDecisions.find(d=>d.activity===activity);
      if(!d.avoidedBy.some(id=>id!=="OFFICER_开"))assert.equal(d.disposition,"OMITTED");
    }
    checked++;
  }
  assert.ok(checked>100);
  const reconciled=at("2020-02-02").result.宜忌;
  assert.ok(!reconciled.宜.includes("安葬"));
  assert.ok(!reconciled.忌.includes("安葬"));
  assert.ok(!at("2020-11-07").result.宜忌.忌.includes("鼓铸"));
});
test("monthly golden cases restore all six grades while retaining the specific military/medical taboos", () => {
  const cases = [["2020-02-14", "上"], ["2020-02-15", "上次"], ["2020-08-12", "中"],
    ["2020-02-08", "中次"], ["2020-03-10", "下"], ["2020-03-11", "上"], ["2020-03-07", "最下"]];
  for (const [date, grade] of cases) assert.equal(at(date).result.宜忌.日等, grade, date);
  assert.ok(at("2020-02-14").result.宜忌.忌.includes("求医"));
  const full = at("2020-02-19");
  assert.equal(full.result.建除十二神.名称, "满");
  assert.ok(full.result.宜忌.宜.includes("上官赴任"));
  assert.ok(!full.result.宜忌.宜忌并存.includes("求医"));
  assert.ok(full.audit.activityDecisions.find(d=>d.activity === "求医").avoidedBy.includes("OFFICER_满"));
});

test("no-taboo printing never invents a recommendation, and the from-avoid exception is enforced", () => {
  const sample = at("2024-01-04");
  assert.equal(sample.result.宜忌.日等, "下");
  assert.ok(sample.result.宜忌.忌.includes("安床"));
  assert.ok(sample.result.宜忌.忌.includes("开仓库"));
  let omitted = 0;
  for (let t=Date.parse("2024-01-01T04:00:00Z");t<Date.parse("2025-01-01T04:00:00Z");t+=86400000) {
    const {result,audit}=calculateAuditableAlmanac(new Date(t));
    for (const decision of audit.activityDecisions) {
      if (decision.rationale.includes("不忌不自动生成宜") && !decision.recommendedBy.length) {
        assert.notEqual(decision.disposition,"RECOMMENDED");
        assert.ok(!result.宜忌.宜.includes(decision.activity));
        if(decision.disposition==="OMITTED")omitted++;
      }
    }
  }
  assert.ok(omitted > 0);
});

test("placement pairs are enforced across an entire year, including day-branch and stem restrictions", () => {
  for (let t=Date.parse("2024-01-01T04:00:00Z");t<Date.parse("2025-01-01T04:00:00Z");t+=86400000) {
    const {result,audit}=calculateAuditableAlmanac(new Date(t)), day=audit.pillars.day;
    const prohibited = [...(day.branchIndex===2?["祈福","求嗣"]:[]), ...(day.branchIndex===3?["开渠"]:[]),
      ...(day.branchIndex===5?["出师","遣使"]:[]), ...(day.stemIndex===3?["整容"]:[]), ...(day.stemIndex===8?["穿井"]:[])];
    for (const activity of prohibited) assert.ok(!result.宜忌.宜.includes(activity), `${new Date(t).toISOString()} ${activity}`);
  }
  const sample=at("2024-03-06");
  assert.ok(sample.result.宜忌.忌.includes("远行"));
  assert.equal(sample.audit.activityDecisions.find(d=>d.activity==="遣使").disposition,"OMITTED");
  const restricted=at("2024-01-18");
  assert.ok(restricted.result.凶煞.includes("无禄"));
  assert.ok(restricted.audit.activityDecisions.find(d=>d.activity==="远行").avoidedBy.includes("DAY_SI_RETAINED_TABOOS"));
  assert.equal(restricted.audit.activityDecisions.find(d=>d.activity==="远行").disposition,"OMITTED");
});

test("volume-five additions follow the final wish table and keep month-empty distinct from month-virtue", () => {
  let wishes=0, empties=0, releasing=0;
  const wish=["乙亥","甲戌","乙酉","丙申","丁未","戊午","己巳","庚辰","辛卯","壬寅","癸丑","甲子"];
  for(let t=Date.parse("2024-01-01T04:00:00Z");t<Date.parse("2026-01-01T04:00:00Z");t+=86400000){
    const {result,audit}=calculateAuditableAlmanac(new Date(t));
    if(result.吉神.includes("月空")){assert.ok(!result.吉神.includes("月德"));empties++;}
    if(result.吉神.includes("天愿")){assert.equal(audit.pillars.day.name,wish[(audit.pillars.month.branchIndex+10)%12]);wishes++;}
    if(result.吉神.includes("解神"))releasing++;
  }
  assert.ok(wishes&&empties&&releasing);
});

test("sensitive event snapshots and the independent 1912 JPL comparison guard against silent day changes", async () => {
  const fixture=JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/sensitive-events.json",import.meta.url),"utf8"));
  for(const event of fixture.events){
    const actual=event.kind==="newMoon"?newMoonInstant(event.k):solarTermInstant(event.year,SOLAR_TERM[event.term]);
    assert.equal(actual.toISOString(),event.instant,event.label??event.term);
  }
  const jpl=JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/jpl-1912-small-snow.json",import.meta.url),"utf8"));
  assert.ok(Math.abs(+solarTermInstant(1912,SOLAR_TERM.MINOR_SNOW)-Date.parse(jpl.interpolatedCrossing))<6000);
  assert.ok(DELTA_T_MAX_YEAR>=SOLAR_MAX_YEAR+2);
});
