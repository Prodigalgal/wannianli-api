import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { parseObserved, parsePredictions } from "../../tools/lib/usno-delta-t.mjs";

const directory = new URL("../../docs/sources/astronomy/usno-2026-10-23/", import.meta.url);
test("USNO source snapshots retain separate observation and prediction columns with MJD dates", async () => {
  const meta = JSON.parse(await readFile(new URL("manifest.json", directory)));
  for (const name of ["observations", "predictions"]) {
    const bytes = await readFile(new URL(name + ".txt", directory));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), meta.files[name].sha256);
  }
  const observed = parseObserved(await readFile(new URL("observations.txt", directory), "utf8"));
  assert.equal(observed.at(-1).date, "2026-10-01"); assert.equal(observed.at(-1).seconds, 69.2065);
  assert.equal(observed.filter(row => row.date >= "2005-01-01").length, 262);
  const predicted = parsePredictions(await readFile(new URL("predictions.txt", directory), "utf8"));
  assert.equal(predicted.length, 46); assert.equal(predicted.at(-1).date, "2033-10-01");
  assert.equal(predicted[0].date, "2022-07-02"); // nominal quarter 2022.50 is not an exact decimal-year instant.
  assert.equal(predicted[0].ut1MinusUtc, -0.104); assert.equal(predicted[0].sourceError, 0.031);
  assert.equal(predicted.at(-1).ut1MinusUtc, null); assert.equal(predicted.at(-1).sourceError, 1);
});

test("invalid, missing and duplicated upstream months cannot silently regenerate the runtime table", () => {
  assert.throws(() => parseObserved("2026 2 30 69.1"));
  assert.throws(() => parseObserved("2026 13 1 69.1"));
  assert.throws(() => parseObserved("2026 1 1 69.1\n2026 3 1 69.2"));
  assert.throws(() => parseObserved("2026 1 1 69.1\n2026 1 1 69.1"));
  assert.throws(() => parsePredictions("MJD Year TT-UT UT1-UTC Error\n61406.000 2057.00 69.14 0.327"));
});
