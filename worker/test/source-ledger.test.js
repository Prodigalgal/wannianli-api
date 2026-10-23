import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

test("the complete facsimile catalog and page ledger do not turn unreviewed pages into coverage", async () => {
  const root = new URL("../../", import.meta.url);
  const catalog = JSON.parse(await readFile(new URL("docs/sources/classical-catalog.json", root)));
  const ledger = JSON.parse(await readFile(new URL("docs/sources/collation-ledger.json", root)));
  assert.deepEqual(catalog.files.flatMap(file => file.volumes), Array.from({ length: 36 }, (_, i) => i + 1));
  assert.equal(catalog.files.reduce((n, file) => n + file.pageCount, 0), 3521);
  assert.equal(ledger.defaultStatus, "NOT_REVIEWED");
  const seen = new Set();
  for (const page of ledger.reviewedPages) {
    const file = catalog.files.find(file => file.id === page.fileId);
    assert.ok(file.volumes.includes(page.volume) && page.scanPage >= 1 && page.scanPage <= file.pageCount);
    const identity = page.fileId + "/" + page.scanPage;
    assert.ok(!seen.has(identity), identity); seen.add(identity);
    assert.ok(["RULE_COLLATION", "TABLE_TRANSCRIBED"].includes(page.status));
    assert.equal(createHash("sha256").update(await readFile(new URL(page.image, root))).digest("hex"), page.sha256, identity);
    if (page.originalSha1) assert.equal(page.originalSha1, file.publishedSha1, identity);
  }
  assert.equal(ledger.reviewedPages.filter(page => page.volume === 6).length, 128);
  assert.equal(ledger.reviewedPages.filter(page => page.volume === 10).length, 32);
  const batch = JSON.parse(await readFile(new URL("docs/sources/collation-batch02.json", root)));
  assert.equal(batch.addedPages, 75);
  assert.equal(batch.cumulativePages, 117);
  assert.equal(batch.baselinePages + batch.addedPages, batch.cumulativePages);
  assert.equal(batch.pages.length, batch.addedPages);
  for (const blank of batch.blankPagesExcluded) {
    assert.ok(!seen.has(blank.fileId + "/" + blank.scanPage), "blank page must not inflate review coverage");
  }
  const third = JSON.parse(await readFile(new URL("docs/sources/collation-batch03.json", root)));
  assert.equal(third.baselinePages, batch.cumulativePages);
  assert.equal(third.addedPages, 43);
  assert.equal(third.pages.length, third.addedPages);
  assert.equal(third.cumulativePages, third.baselinePages + third.addedPages);
  assert.equal(third.cumulativePages, ledger.reviewedPages.length);
  for (const page of [...batch.pages, ...third.pages]) assert.ok(seen.has(page.fileId + "/" + page.scanPage));
  const completed = third.volumeCompletion;
  const rules = ledger.reviewedPages.filter(page => page.volume === completed.volume);
  assert.equal(completed.rulePages, rules.length);
  assert.equal(completed.blankPages, completed.excludedPages.filter(page => page.kind === "BLANK").length);
  assert.equal(completed.structuralPages, completed.excludedPages.filter(page => page.kind !== "BLANK").length);
  for (const page of completed.excludedPages) {
    assert.ok(!seen.has(page.fileId + "/" + page.scanPage), "excluded page must not inflate rule coverage");
    assert.equal(createHash("sha256").update(await readFile(new URL(page.image, root))).digest("hex"), page.sha256);
  }
  const allScans = [...rules, ...completed.excludedPages].map(page => page.scanPage).sort((a,b) => a-b);
  assert.deepEqual(allScans, Array.from({length: completed.scanPages}, (_,i) => i+1));
  const electronic = JSON.parse(await readFile(new URL("docs/sources/electronic-supplements/manifest.json", root)));
  assert.equal(electronic.completeBookVerified, false);
  assert.deepEqual(electronic.files.map(page => page.volume), [6,10,14]);
  for (const page of electronic.files) {
    const bytes = await readFile(new URL("docs/sources/electronic-supplements/" + page.file, root));
    assert.equal(bytes.length, page.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), page.sha256);
    assert.equal(page.status, "TRANSCRIPT_SNAPSHOT_NOT_RULE_VERIFIED");
    assert.ok(page.sourceUrl.endsWith("oldid=" + page.revision));
  }
});
