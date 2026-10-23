import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { newMoonInstant, solarTermInstant, SOLAR_TERM, utcPlus8CivilDate } from "../worker/src/astronomy.js";

const fixture = JSON.parse(await readFile(new URL("../src/test/resources/fixtures/historical-calendar-differences.json", import.meta.url), "utf8"));
const hko = JSON.parse(await readFile(new URL("../build/validation/hko/summary.json", import.meta.url), "utf8"));
const covered = new Set();
const events = fixture.events.map(entry => {
  const instant = entry.kind === "newMoon" ? newMoonInstant(entry.k) : solarTermInstant(entry.year, SOLAR_TERM[entry.term]);
  const differenceSeconds = (instant.getTime() - Date.parse(entry.modernTime)) / 1000;
  assert.ok(Math.abs(differenceSeconds) <= 60, `${entry.modernTime}: exceeds independently published minute`);
  assert.equal(utcPlus8CivilDate(instant), entry.modernTime.slice(0, 10));
  const rows = hko.mismatches.filter((row, i) => {
    const match = entry.kind === "solarTerm" ? row.year === entry.year && row.term === entry.name
      && row.expected === entry.historicalDate && row.actual === entry.modernTime.slice(0, 10)
      : row.date && row.date >= entry.historicalDate && Date.parse(row.date) < Date.parse(entry.historicalDate) + 30 * 86400000;
    if (match) covered.add(i); return match;
  });
  return { ...entry, projectInstant: instant.toISOString(), differenceSeconds, matchingHkoRows: rows.length };
});
const remaining = hko.mismatches.filter((row, i) => !covered.has(i));
assert.ok(remaining.every(row => row.date?.startsWith("2057-")), "New unexplained mismatch outside the known future boundary");
const result = { source: fixture.source, sourceType: fixture.sourceType, checkedAt: new Date().toISOString(),
  totalHkoDifferences: hko.mismatchCount, historicallyMatchedRows: covered.size, remainingRows: remaining.length, events,
  interpretation: `${fixture.events.length}个事件与独立历史历书对照相符；不替代HKO原始底本核定，不把历史颁历日期用于覆盖现代天文瞬间。原始HKO差分仍保留失败状态。` };
await mkdir(new URL("../build/validation/", import.meta.url), { recursive: true });
await writeFile(new URL("../build/validation/historical-attribution.json", import.meta.url), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
