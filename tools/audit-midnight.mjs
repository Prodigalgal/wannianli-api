import { mkdir, writeFile } from "node:fs/promises";
import { deltaTSeconds, formatUtcPlus8, newMoonInstant, SOLAR_TERMS, solarTermInstant, utcPlus8CivilDate } from "../worker/src/astronomy.js";

// Distances are sensitivity thresholds, not predictions or statistical error bounds.
const events = [];
function add(kind, instant, name) {
  const date = utcPlus8CivilDate(instant);
  if (date < "2027-01-01" || date > "2199-12-31") return;
  const milliseconds = ((instant.getTime() + 8 * 3600000) % 86400000 + 86400000) % 86400000;
  const secondsFromMidnight = Math.min(milliseconds, 86400000 - milliseconds) / 1000;
  if (secondsFromMidnight <= 180) events.push({ kind, name, at: formatUtcPlus8(instant), secondsFromMidnight });
}
for (let k = 330; k <= 2473; k++) add("朔", newMoonInstant(k), `k=${k}`);
for (let year = 2027; year <= 2199; year++) {
  for (const term of SOLAR_TERMS) add("节气", solarTermInstant(year, term), term.name);
}
events.sort((a, b) => a.at.localeCompare(b.at));
const bands = [[2027, 2050], [2051, 2100], [2101, 2199]].map(([start, end]) => {
  const selected = events.filter((event) => Number(event.at.slice(0, 4)) >= start && Number(event.at.slice(0, 4)) <= end);
  return { years: `${start}-${end}`, within60Seconds: selected.filter((event) => event.secondsFromMidnight <= 60).length,
    within180Seconds: selected.length, minimumSeconds: Math.min(...selected.map((event) => event.secondsFromMidnight)) };
});
const result = { model: "Meeus 2nd ed + observed/calibrated Delta T; current project model only", bands,
  deltaT: [2024, 2025, 2026, 2030, 2050, 2057, 2097, 2100, 2199].map((year) => ({ year, seconds: deltaTSeconds(year) })), events };
const directory = new URL("../build/validation/", import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(new URL("midnight-sensitivity.json", directory), JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
