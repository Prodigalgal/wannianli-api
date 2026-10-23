import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { parseObserved } from "./lib/usno-delta-t.mjs";

const source = "https://maia.usno.navy.mil/ser7/deltat.data";
const lastDate = "2026-10-01";
let text;
if (process.argv[2]) text = await readFile(process.argv[2], "utf8");
else {
  const response = await fetch(source, { signal: AbortSignal.timeout(20000) });
  assert.ok(response.ok, `USNO HTTP ${response.status}`); text = await response.text();
}
const parsed = parseObserved(text);
assert.equal(parsed.at(-1).date, lastDate, "USNO observations changed: review the new anchor and sensitive dates before regenerating");
const rows = parsed.filter(row => row.date >= "2005-01-01").map(row => [row.decimalYear, row.seconds]);
assert.equal(rows.length, 262);
assert.equal(rows[0][0], 2005);
assert.equal(rows.at(-1)[1], 69.2065);
const javaRows = rows.map(([year, value]) => `            {${year}, ${value}}`).join(",\n");
const java = `package cn.wannianli.calendar.astronomy;

/** Generated from USNO monthly observations, 2005-01-01 through ${lastDate}; retrieved 2026-10-22.
 * Source: ${source}
 */
final class ObservedDeltaT {
    private static final double[][] VALUES = {
${javaRows}
    };
    static final double LAST_YEAR = VALUES[VALUES.length - 1][0];
    static final double LAST_SECONDS = VALUES[VALUES.length - 1][1];

    private ObservedDeltaT() { }

    static double seconds(double year) {
        if (year < VALUES[0][0] || year > LAST_YEAR) return Double.NaN;
        for (int i = 1; i < VALUES.length; i++) {
            if (year <= VALUES[i][0]) {
                double fraction = (year - VALUES[i - 1][0]) / (VALUES[i][0] - VALUES[i - 1][0]);
                return VALUES[i - 1][1] + fraction * (VALUES[i][1] - VALUES[i - 1][1]);
            }
        }
        return LAST_SECONDS;
    }
}
`;
const js = `// Generated from USNO monthly observations, 2005-01-01 through ${lastDate}; retrieved 2026-10-22.
// Source: ${source}
const VALUES = ${JSON.stringify(rows)};
export const LAST_OBSERVED_YEAR = VALUES.at(-1)[0];
export const LAST_OBSERVED_SECONDS = VALUES.at(-1)[1];
export function observedDeltaT(year) {
  if (year < VALUES[0][0] || year > LAST_OBSERVED_YEAR) return NaN;
  for (let index = 1; index < VALUES.length; index++) {
    if (year <= VALUES[index][0]) {
      const [start, value] = VALUES[index - 1];
      const [end, next] = VALUES[index];
      return value + (year - start) / (end - start) * (next - value);
    }
  }
  return LAST_OBSERVED_SECONDS;
}
`;
await writeFile(new URL("../src/main/java/cn/wannianli/calendar/astronomy/ObservedDeltaT.java", import.meta.url), java);
await writeFile(new URL("../worker/src/observed-delta-t.js", import.meta.url), js);
console.log(JSON.stringify({ source, lastDate, observations: rows.length }));
