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
  }
  assert.equal(ledger.reviewedPages.filter(page => page.volume === 6).length, 30);
  assert.equal(ledger.reviewedPages.filter(page => page.volume === 10).length, 12);
});
