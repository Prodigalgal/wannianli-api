import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { calculateAuditableAlmanac } from "../src/engine.js";
import { absoluteCase } from "../src/classical.js";

// Transcribed independently from the two facsimile pages, not generated from runtime rules.
const table = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/volume10-grade-table.json", import.meta.url), "utf8"));

test("the original grade table has eleven columns and exactly twelve month entries per column", () => {
  assert.equal(table.columns.length, 11);
  assert.equal(table.grades.length, 6);
  for (const column of table.columns) {
    assert.equal(column.monthsByGrade.length, 6);
    assert.deepEqual(column.monthsByGrade.flat().sort((a, b) => a - b), Array.from({ length: 12 }, (_, i) => i), column.name);
  }
  assert.deepEqual(table.source.scans.map(scan => scan.leaf), ["72b", "73a"]);
});

test("five years of calculated grades agree with the facsimile, preserving separately stated exceptions", () => {
  let matched = 0, explicitExceptions = 0, unlisted = 0;
  for (let t = Date.parse("2020-01-01T04:00:00Z"); t < Date.parse("2025-01-01T04:00:00Z"); t += 86400000) {
    const { result, audit } = calculateAuditableAlmanac(new Date(t));
    const anchors = [result.建除十二神.名称 + "日", ...result.凶煞];
    const columns = table.columns.filter(column => anchors.includes(column.name));
    if (!columns.length) { unlisted++; continue; }
    const grades = columns.map(column => table.grades[column.monthsByGrade.findIndex(months => months.includes(audit.pillars.month.branchIndex))]);
    assert.equal(new Set(grades).size, 1, `${new Date(t).toISOString()}: source columns disagree`);
    matched++;
    const actual = table.grades[table.gradeLabels.indexOf(result.宜忌.日等)];
    if (actual === grades[0]) continue;
    const absolute = absoluteCase(audit.pillars.month, audit.pillars.day)
      || result.建除十二神.名称 === "破" && result.凶煞.includes("四废");
    const pressure = result.凶煞.some(name => ["四废", "岁薄", "逐阵"].includes(name))
      && columns.some(column => ["天吏", "大时"].includes(column.name));
    assert.ok(absolute || pressure, `${new Date(t).toISOString()}: unexplained departure from original grade table`);
    if (absolute) assert.equal(result.宜忌.日等, "最下");
    explicitExceptions++;
  }
  assert.deepEqual({ matched, explicitExceptions, unlisted }, { matched: 1128, explicitExceptions: 64, unlisted: 699 });
});
