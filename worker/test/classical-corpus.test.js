import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildPageIndex, loadCorpus, parseTranscription, searchPages, textFlags, verifyNavigationIndex, volumeNumber } from "../../tools/lib/classical-corpus.mjs";
import { inspectDjvu } from "../../tools/lib/djvu-pages.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const json = async path => JSON.parse(await readFile(new URL("../../" + path, import.meta.url)));
const corpus = await loadCorpus(root);
const [catalog, ledger, layout] = await Promise.all([
  json("docs/sources/classical-catalog.json"), json("docs/sources/collation-ledger.json"), json("docs/sources/classical-scan-layout.json")
]);

test("pinned transcription titles expose the missing volume instead of equating file number and volume", () => {
  assert.deepEqual(corpus.missingVolumes, [14]);
  assert.equal(corpus.pages.find(page => page.file === "KR3g0051_014.txt").volume, 15);
  assert.equal(corpus.pages.find(page => page.file === "KR3g0051_035.txt").volume, 36);
  assert.equal(volumeNumber("御製序"), 0);
});

test("all actual scan pages are indexed while the review ledger remains the only coverage source", () => {
  const { records } = buildPageIndex(catalog, ledger, corpus, layout);
  assert.equal(records.length, 3521);
  assert.equal(new Set(records.map(page => page.id)).size, 3521);
  assert.equal(records.filter(page => page.reviewStatus !== "NOT_REVIEWED").length, ledger.reviewedPages.length);
  assert.equal(records.find(page => page.id === "CADAL06056513/3").reviewStatus, "NOT_REVIEWED");
  assert.ok(records.filter(page => page.candidateTextPages.length).every(page => page.reviewStatus === "NOT_REVIEWED"));
  assert.equal(records.find(page => page.id === "CADAL06056510/221").exactTextPageId, null);
  assert.equal(records.find(page => page.id === "CADAL06056510/222").exactTextPageId, "KR3g0051_WYG_010-73a");
});

test("duplicate leaf labels retain both passages and cannot be used as exact scan mappings", () => {
  const pages = corpus.pages.filter(page => page.marker === "KR3g0051_WYG_009-32b");
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map(page => page.id), ["KR3g0051_WYG_009-32b#1", "KR3g0051_WYG_009-32b#2"]);
  assert.ok(pages.every(page => page.ambiguousLeaf));
  assert.notEqual(pages[0].text, pages[1].text);
  const { texts } = buildPageIndex(catalog, ledger, corpus, layout);
  assert.ok(texts.filter(page => pages.some(p => p.id === page.id)).every(page => page.verifiedScanId === null));
});

test("scan count and edition mismatch fail before page coverage can be generated", () => {
  const wrongCount = structuredClone(layout); wrongCount.files[0].pages.pop();
  assert.throws(() => buildPageIndex(catalog, ledger, corpus, wrongCount), /page counts differ/u);
  const wrongEdition = structuredClone(layout); wrongEdition.files[0].sha1 = "0".repeat(40);
  assert.throws(() => buildPageIndex(catalog, ledger, corpus, wrongEdition), /another facsimile/u);
});

test("conflicting verified offsets disable speculative linear links", () => {
  const altered = structuredClone(ledger);
  altered.reviewedPages.find(page => page.volume === 6 && page.scanPage === 15).leaf = "8a";
  const { records, warnings } = buildPageIndex(catalog, altered, corpus, layout);
  assert.ok(warnings.includes("NONLINEAR_LEAF_MAPPING:CADAL06056507/6"));
  assert.ok(records.filter(page => page.fileId === "CADAL06056507").every(page => page.candidateTextPages.length === 0));
});

test("limited spelling and activity aliases locate actual no-annotation and related clauses", () => {
  assert.ok(searchPages(corpus, ["不注"], [10]).some(page => page.leaf === "32a"));
  assert.ok(searchPages(corpus, ["安床"], [11]).some(page => page.text.includes("安牀")));
  assert.deepEqual(searchPages(corpus, ["搬移"], [10, 11]).map(page => page.id), searchPages(corpus, ["般移"], [10, 11]).map(page => page.id));
  assert.ok(searchPages(corpus, ["游祸"], [6]).some(page => page.leaf === "22b"));
  assert.ok(searchPages(corpus, ["闭日"], [10]).length);
  assert.deepEqual(searchPages(corpus, ["甲甲甲甲甲"], [6]), []);
});

test("empty drafts and rejection/combination markers remain review hints", () => {
  assert.ok(textFlags("　\n", 15).includes("EMPTY_TRANSCRIPT_REVIEW_IMAGE"));
  for (const flag of ["REJECTED_OLD_THEORY_CANDIDATE", "COMBINATION_CANDIDATE", "EXCEPTION_CANDIDATE"])
    assert.ok(textFlags("未當，不註宜，與月德併", 10).includes(flag));
  assert.throws(() => parseTranscription("#+PROPERTY: JUAN 卷十\n<pb:KR3g0051_WYG_010-1a>", { juan: "卷九", file: "x", pageMarkers: 1 }), /Volume metadata changed/u);
});

test("DjVu inspection rejects truncation and counts actual page FORM chunks", () => {
  const chunk = (type, payload) => {
    const header = Buffer.alloc(8); header.write(type); header.writeUInt32BE(payload.length, 4);
    return Buffer.concat([header, payload, payload.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
  };
  const info = Buffer.alloc(10); info.writeUInt16BE(957); info.writeUInt16BE(1359, 2);
  const page = chunk("FORM", Buffer.concat([Buffer.from("DJVU"), chunk("INFO", info)]));
  const file = Buffer.concat([Buffer.from("AT&T"), chunk("FORM", Buffer.concat([Buffer.from("DJVM"), page, page]))]);
  assert.equal(inspectDjvu(file).length, 2);
  assert.deepEqual(inspectDjvu(file).map(page => [page.width, page.height]), [[957, 1359], [957, 1359]]);
  assert.throws(() => inspectDjvu(file.subarray(0, -1)), /Truncated/u);
  assert.throws(() => inspectDjvu(Buffer.from("not an image")), /Not a DjVu/u);
});

test("search refuses a stale review ledger or a modified page index", async () => {
  const [plan, summary, text] = await Promise.all([json("docs/sources/classical-review-plan.json"),
    json("docs/sources/classical-index-summary.json"), readFile(new URL("../../docs/sources/classical-page-index.jsonl", import.meta.url), "utf8")]);
  const sources = { catalog, ledger, layout, plan, manifest: corpus.manifest };
  verifyNavigationIndex(summary, sources, text);
  const altered = structuredClone(sources); altered.ledger.reviewedPages.pop();
  assert.throws(() => verifyNavigationIndex(summary, altered, text), /sources changed/u);
  assert.throws(() => verifyNavigationIndex(summary, sources, text + "{}\n"), /page index changed/u);
});
