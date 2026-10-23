import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCorpus, searchPages, textFlags, verifyNavigationIndex } from "./lib/classical-corpus.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2), terms = [];
let volumes = [], limit = 20, context = 1, json = false, familyId;
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--json") json = true;
  else if (["--volumes", "--limit", "--context", "--family"].includes(arg)) {
    const value = args[++i]; assert.ok(value && !value.startsWith("--"), `Missing value for ${arg}`);
    if (arg === "--volumes") { assert.match(value, /^\d+(,\d+)*$/u); volumes = value.split(",").map(Number); }
    if (arg === "--limit") { assert.match(value, /^\d+$/u); limit = Number(value); }
    if (arg === "--context") { assert.match(value, /^\d+$/u); context = Number(value); }
    if (arg === "--family") familyId = value;
  } else { assert.ok(!arg.startsWith("--"), `Unknown flag ${arg}`); terms.push(arg); }
}
assert.ok(Number.isInteger(limit) && limit >= 1 && limit <= 500, "Limit must be 1..500");
assert.ok(Number.isInteger(context) && context >= 0 && context <= 3, "Context must be 0..3 neighboring fragments");
assert.ok(volumes.every(volume => Number.isInteger(volume) && volume >= 0 && volume <= 36), "Volumes must be 0..36");
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [corpus, indexText, plan, catalog, ledger, layout, summary] = await Promise.all([loadCorpus(root),
  readFile(resolve(root, "docs/sources/classical-page-index.jsonl"), "utf8"),
  readJson("docs/sources/classical-review-plan.json"), readJson("docs/sources/classical-catalog.json"),
  readJson("docs/sources/collation-ledger.json"), readJson("docs/sources/classical-scan-layout.json"),
  readJson("docs/sources/classical-index-summary.json")]);
verifyNavigationIndex(summary, { catalog, ledger, layout, plan, manifest: corpus.manifest }, indexText);
const scans = indexText.trim().split("\n").map(line => JSON.parse(line));
let hits;
if (familyId) {
  assert.equal(terms.length, 0, "Use either search terms or --family");
  const family = plan.families.find(family => family.id === familyId); assert.ok(family, `Unknown family ${familyId}`);
  if (!volumes.length) volumes = family.volumes;
  const unique = new Map(family.terms.flatMap(term => searchPages(corpus, [term], volumes).map(page => [page.id, page])));
  hits = [...unique.values()].sort((a, b) => a.volume - b.volume || a.sourceLine - b.sourceLine);
} else { hits = searchPages(corpus, terms, volumes); }
const locations = new Map();
for (const scan of scans) {
  if (scan.exactTextPageId) locations.set(scan.exactTextPageId, [{ scanId: scan.id, status: "VERIFIED_LEAF_LINK", sourceUrl: scan.sourceUrl, image: scan.reviewedImage }]);
  for (const candidate of scan.candidateTextPages) {
    if (!locations.has(candidate.textPageId)) locations.set(candidate.textPageId, []);
    locations.get(candidate.textPageId).push({ scanId: scan.id, status: "CANDIDATE_NOT_VERIFIED", sourceUrl: scan.sourceUrl, image: null });
  }
}
const results = hits.slice(0, limit).map(page => {
  const index = corpus.pages.indexOf(page);
  return { textPageId: page.id, volume: page.volume, leaf: page.leaf, ambiguousLeaf: page.ambiguousLeaf,
    status: "NAVIGATION_DRAFT", flags: textFlags(page.text, page.volume),
    sourceFile: `docs/sources/classical-texts/${page.file}`, sourceLine: page.sourceLine, sourceUrl: page.sourceUrl,
    scanLinks: locations.get(page.id) ?? [],
    context: corpus.pages.slice(Math.max(0, index - context), index + context + 1).filter(item => item.file === page.file)
      .map(item => ({ textPageId: item.id, leaf: item.leaf, text: item.text })) };
});
const output = { query: familyId ?? terms, totalHits: hits.length, returned: results.length,
  missingTranscriptVolumes: corpus.missingVolumes, note: "导航草稿：读前引旧说及最终按语；空文本不代表空原图；候选扫描链接须回看确认。", results };
if (json) console.log(JSON.stringify(output, null, 2));
else {
  console.log(`${output.note}\n共${hits.length}个命中片段，显示${results.length}个；转录缺卷${corpus.missingVolumes.join("、")}`);
  for (const result of results) {
    console.log(`\n[${result.textPageId}] 卷${result.volume} ${result.leaf} ${result.ambiguousLeaf ? "重复叶码待核" : ""}`);
    console.log(`${result.sourceFile}:${result.sourceLine}\n${result.flags.join(", ")}`);
    for (const link of result.scanLinks) console.log(`${link.status}: ${link.scanId} ${link.sourceUrl}`);
    for (const fragment of result.context) console.log(`--- ${fragment.leaf} ---\n${fragment.text}`);
  }
}
