import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { addCoreGods, coreGodHits } from "../src/god-rules.js";
import { cycleFromIndex, BRANCHES } from "../src/calendar.js";
import { calculateAuditableAlmanac } from "../src/engine.js";

const fixture = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/volume06-remainder.json", import.meta.url)));
const at = date => calculateAuditableAlmanac(new Date(date + "T04:00:00Z"));
const namesFor = (ordinal, index) => {
  const good = [], bad = [];
  addCoreGods(good, bad, cycleFromIndex((ordinal + 2) % 12), cycleFromIndex(index));
  return { good, bad };
};

test("the second facsimile batch has 120 independent monthly cells checked over all 720 month/day combinations", () => {
  for (let ordinal = 0; ordinal < 12; ordinal++) for (let index = 0; index < 60; index++) {
    const { good, bad } = namesFor(ordinal, index), day = cycleFromIndex(index);
    for (const [name, rows] of Object.entries(fixture.branchStarts)) {
      assert.equal([...good, ...bad].includes(name), rows[ordinal] === BRANCHES[day.branchIndex], `${ordinal+1}月 ${day.name} ${name}`);
    }
    assert.equal(bad.includes("地囊"), fixture.earthSackCorrectedDays[ordinal].includes(day.name), `${ordinal+1}月 ${day.name} 地囊`);
  }
});

test("earth sack uses the corrected diagrams and author conclusion, excluding the old quoted errors", () => {
  const index = name => Array.from({length:60},(_,i)=>i).find(i=>cycleFromIndex(i).name === name);
  for (const [ordinal, day, expected] of [[1,"乙未",true],[1,"癸未",false],[2,"壬午",true],[2,"甲寅",false],[3,"己酉",true],[3,"己丑",false]]) {
    assert.equal(namesFor(ordinal, index(day)).bad.includes("地囊"), expected, day);
  }
});

test("final volume ten activity lists exclude retracted marriage, finance, and beam prohibitions", () => {
  for (const [name, expected] of Object.entries(fixture.finalActivities)) {
    const almanac = {gods:{auspicious:[name,"天德","天赦","天愿"],inauspicious:[name]},dayOfficer:{name:"平"}};
    const hits = coreGodHits(cycleFromIndex(2), cycleFromIndex(0), almanac).filter(h=>h.name===name);
    const raw = hits.find(h=>h.ruleId.startsWith("CLASSICAL_RAW_"));
    assert.deepEqual(raw.recommends, expected.recommends, name);
    assert.deepEqual(raw.avoids, expected.avoids, name);
    if (expected.avoids.length) assert.deepEqual(hits.find(h=>h.ruleId.endsWith("_RETAINED_TABOOS")).avoids, expected.avoids, name);
  }
});

test("eight real virtue conjunctions preserve the newly verified specific taboos", () => {
  for (const [god,date] of Object.entries(fixture.virtueRetainedCases)) {
    const {result} = at(date);
    assert.ok(result.凶煞.includes(god), date+" "+god);
    assert.equal(result.宜忌.有德神,"是",date);
    assert.ok(!result.凶煞.includes("无禄"),date);
    for (const activity of fixture.finalActivities[god].avoids) {
      assert.ok(result.宜忌.忌.includes(activity), `${date} ${god} ${activity}`);
      assert.ok(!result.宜忌.宜.includes(activity), `${date} ${god} ${activity}`);
    }
  }
});

test("going loss changes proclamation without carrying its own taboo to administration", () => {
  const {result, audit} = at("2020-01-23");
  assert.ok(result.凶煞.includes("往亡") && !result.凶煞.includes("月厌"));
  const original = audit.activityDecisions.find(d=>d.activity==="宣政事");
  const changed = audit.activityDecisions.find(d=>d.activity==="布政事");
  assert.ok(original.recommendedBy.length > 0);
  assert.equal(original.disposition,"AVOID");
  assert.equal(changed.disposition,"RECOMMENDED");
  for (const id of original.recommendedBy) assert.ok(changed.recommendedBy.includes(id));
  assert.ok(changed.avoidedBy.every(id=>!id.includes("GOING_LOSS")));
});

test("earth sack and token suppress plugging holes, and yin/yang virtue cannot become a resolving virtue", () => {
  for (const [date,god] of [["2020-01-13","地囊"],["2020-03-15","土符"]]) {
    const {result,audit} = at(date);
    assert.ok(result.凶煞.includes(god));
    assert.ok(!result.凶煞.some(n=>["土府","土王用事"].includes(n)));
    const holes = audit.activityDecisions.find(d=>d.activity==="塞穴");
    assert.ok(holes.recommendedBy.length > 0);
    assert.equal(holes.disposition,"OMITTED");
  }
  let found=0;
  for(let t=Date.parse("2024-01-01T04:00:00Z");t<Date.parse("2025-01-01T04:00:00Z");t+=86400000) {
    const r=calculateAuditableAlmanac(new Date(t)).result;
    if(r.吉神.some(n=>["阳德","阴德"].includes(n))&&!r.吉神.some(n=>["天德","月德","天德合","月德合"].includes(n))) {
      assert.equal(r.宜忌.有德神,"否"); found++;
    }
  }
  assert.ok(found>0);
});
