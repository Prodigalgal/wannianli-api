import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { calculateChineseCalendar } from "../worker/src/calendar.js";
import { SOLAR_TERMS, solarTermInstant, utcPlus8CivilDate } from "../worker/src/astronomy.js";

const args = process.argv.slice(2);
const years = args.includes("--all") ? Array.from({ length: 200 }, (_, i) => 1901 + i)
  : args.length ? args.map(Number) : [2026, 2033, 2034];
assert.ok(years.every((year) => Number.isInteger(year) && year >= 1901 && year <= 2100), "Use HKO years 1901-2100");
const cache = new URL("../build/validation/hko/", import.meta.url);
await mkdir(cache, { recursive: true });
const monthNames = ["", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
const dayNames = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
const simplified = (value) => value.replace(/[驚蟄穀滿處種]/gu, (character) => ({ "驚": "惊", "蟄": "蛰", "穀": "谷", "滿": "满", "處": "处", "種": "种" })[character]);
const mismatches = [];
let checkedDays = 0;
let checkedTerms = 0;
let skippedDays = 0;

async function load(year) {
  const file = new URL(`T${year}c.txt`, cache);
  try { return await readFile(file, "utf8"); } catch (error) { if (error.code !== "ENOENT") throw error; }
  const url = `https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T${year}c.txt`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const content = await response.text();
  assert.ok(content.includes("公曆") && new RegExp(`${year}年0?1月0?1日`, "u").test(content), `${year}: source format changed`);
  await writeFile(file, content, "utf8");
  return content;
}

// Bounded concurrency keeps the public source load modest; fixtures are cached outside source control.
const texts = new Map();
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < years.length) {
    const year = years[next++];
    texts.set(year, await load(year));
  }
}));

let previousYear;
let lunarYear;
let lunarMonth;
let leap;
for (const year of [...years].sort((a, b) => a - b)) {
  if (previousYear !== year - 1) lunarMonth = undefined;
  const terms = new Map();
  let rows = 0;
  for (const line of texts.get(year).normalize("NFKC").split(/\r?\n/u)) {
    const row = /^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\S+)\s+星期[一二三四五六日](?:\s+(\S+))?/u.exec(line);
    if (!row) continue;
    rows++;
    const date = `${row[1]}-${row[2].padStart(2, "0")}-${row[3].padStart(2, "0")}`;
    const value = row[4];
    if (row[5]) terms.set(simplified(row[5]), date);
    const month = monthNames.indexOf(value.replace(/^閏/u, ""));
    let day;
    if (month > 0) {
      lunarMonth = month;
      leap = value.startsWith("閏");
      if (month === 1 && !leap) lunarYear = year;
      else if (lunarYear === undefined || previousYear !== year - 1 && date < `${year}-02-01`) lunarYear = year - 1;
      day = 1;
    } else day = dayNames.indexOf(value);
    assert.ok(day >= 1, `${date}: unrecognized lunar label ${value}`);
    if (lunarMonth === undefined) { skippedDays++; continue; }
    const actual = calculateChineseCalendar(date);
    const expected = [lunarYear, lunarMonth, day, leap];
    const obtained = [actual.year, actual.month, actual.day, actual.leapMonth];
    if (JSON.stringify(expected) !== JSON.stringify(obtained)) mismatches.push({ date, expected, actual: obtained });
    checkedDays++;
  }
  assert.equal(rows, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365, `${year}: missing rows`);
  assert.equal(terms.size, 24, `${year}: missing solar terms`);
  for (const term of SOLAR_TERMS) {
    const actual = utcPlus8CivilDate(solarTermInstant(year, term));
    const expected = terms.get(term.name);
    if (actual !== expected) mismatches.push({ year, term: term.name, expected, actual });
    checkedTerms++;
  }
  previousYear = year;
}
const result = {
  years: [...years].sort((a, b) => a - b), checkedDays, checkedTerms, skippedDays,
  source: "https://www.hko.gov.hk/tc/gts/time/conversion1_text.htm",
  note: "Skipped leading days have no independent lunar-month label before the first month start; self consistency is tested separately.",
  mismatchCount: mismatches.length, mismatches,
};
await writeFile(new URL("summary.json", cache), JSON.stringify(result, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ ...result, years: `${Math.min(...years)}-${Math.max(...years)} (${years.length} years)`,
  mismatches: mismatches.filter((value) => value.term || value.expected?.[2] === 1 || value.actual?.[2] === 1) }, null, 2));
if (mismatches.length) process.exitCode = 1;
