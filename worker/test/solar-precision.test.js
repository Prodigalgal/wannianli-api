import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { nutationLongitudeDegrees } from "../src/nutation.js";
import { SOLAR_TERM, solarTermInstant, utcPlus8CivilDate } from "../src/astronomy.js";

test("complete nutation matches the pinned ERFA t_nut80 reference", () => {
  assert.ok(Math.abs(nutationLongitudeDegrees(2_400_000.5 + 53_736) * Math.PI / 180
    - (-0.9643658353226563966e-5)) < 1e-13);
});

test("solar crossings match independent JPL samples including 1979 major cold", async () => {
  const fixture = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/jpl-solar-crossings.json", import.meta.url), "utf8"));
  for (const event of fixture.events) {
    const instant = solarTermInstant(event.year, SOLAR_TERM[event.term]);
    assert.ok(Math.abs(+instant - Date.parse(event.interpolatedCrossing)) < event.maxDifferenceSeconds * 1000,
      `${event.year} ${event.term}`);
  }
  assert.equal(utcPlus8CivilDate(solarTermInstant(1979, SOLAR_TERM.MAJOR_COLD)), "1979-01-20");
});
