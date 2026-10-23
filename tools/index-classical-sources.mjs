import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPageIndex, loadCorpus, navigationFingerprint, sha256, verifyLedgerImages } from "./lib/classical-corpus.mjs";
import { createReviewQueue } from "./lib/classical-review-queue.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
assert.ok(process.argv.slice(2).every(arg => arg === "--check"), "Usage: node tools/index-classical-sources.mjs [--check]");
const check = process.argv.includes("--check");
const readJson = async path => JSON.parse(await readFile(resolve(root, path), "utf8"));
const [catalog, ledger, layout, plan, corpus] = await Promise.all([
  readJson("docs/sources/classical-catalog.json"), readJson("docs/sources/collation-ledger.json"),
  readJson("docs/sources/classical-scan-layout.json"), readJson("docs/sources/classical-review-plan.json"), loadCorpus(root)
]);
await verifyLedgerImages(root, ledger);
const { records, texts, warnings } = buildPageIndex(catalog, ledger, corpus, layout);
const queue = createReviewQueue(corpus, plan, records);
const pageIndexText = records.map(page => JSON.stringify(page)).join("\n") + "\n";
const ambiguous = corpus.pages.filter(page => page.ambiguousLeaf);
const summary = { schemaVersion: 1, textRevision: corpus.manifest.revision,
  sourceFingerprint: navigationFingerprint({ catalog, ledger, layout, plan, manifest: corpus.manifest }), pageIndexSha256: sha256(pageIndexText),
  facsimileFiles: catalog.files.length, volumes: catalog.files.flatMap(file => file.volumes).length,
  scanPages: records.length, originalBytesVerified: layout.files.reduce((n, file) => n + file.bytes, 0),
  pageRecords: records.length, reviewedPages: ledger.reviewedPages.length,
  ruleCollationPages: ledger.reviewedPages.filter(page => page.status === "RULE_COLLATION").length,
  tableTranscribedPages: ledger.reviewedPages.filter(page => page.status === "TABLE_TRANSCRIBED").length,
  unreviewedPages: records.filter(page => page.reviewStatus === "NOT_REVIEWED").length,
  transcriptFiles: corpus.manifest.files.length,
  transcriptVolumes: new Set(corpus.pages.filter(page => page.volume).map(page => page.volume)).size,
  transcriptFragments: texts.length, missingTranscriptVolumes: corpus.missingVolumes,
  emptyTranscriptFragments: texts.filter(page => page.flags.includes("EMPTY_TRANSCRIPT_REVIEW_IMAGE")).length,
  duplicatedLeafMarkers: new Set(ambiguous.map(page => page.marker)).size,
  ambiguousTranscriptFragments: ambiguous.length,
  verifiedScanTextLinks: records.filter(page => page.exactTextPageId).length,
  reviewedScansWithoutTextFragments: records.filter(page => page.reviewStatus !== "NOT_REVIEWED" && !page.exactTextPageId).map(page => page.id),
  candidateScanTextLinks: records.reduce((n, page) => n + page.candidateTextPages.length, 0),
  embeddedTextLayerPages: records.filter(page => page.embeddedTextLayer).length,
  landscapeOrSpreadCandidates: records.filter(page => page.geometryHints.length).length,
  classificationNote: "卷类路由、尺寸和文本标签是候选分类；未逐页判定目录/正文/表格/留白。空转录不是空白原图。",
  reviewNote: "核验数量由既有人工台账读取；索引、缓存、转录、候选映射和工作队列均不能自动增加核验。",
  warnings };

const lines = ["# 全书分页索引与检索进度", "", "本页由 `node tools/index-classical-sources.mjs` 生成；校勘方法与验收条件见[工作流程](CLASSICAL_WORKFLOW.md)。", "",
  "## 进度分别计数", "", "| 项目 | 数量与口径 |", "|---|---|",
  `| 原始影像 | ${summary.facsimileFiles}册，${summary.volumes}卷，${summary.scanPages}扫描页；全部原始字节已在本机缓存并按公布SHA-1匹配 |`,
  `| 分页记录 | ${summary.pageRecords}页；每页有稳定ID、册号、扫描序号、尺寸及卷类路由候选 |`,
  `| 既有影像核对 | ${summary.ruleCollationPages}页相关规则核对、${summary.tableTranscribedPages}页等第表转录；其余${summary.unreviewedPages}页未核 |`,
  `| 电子转录草稿 | ${summary.transcriptFiles}文件，含卷首及${summary.transcriptVolumes}卷，${summary.transcriptFragments}片段；缺卷${summary.missingTranscriptVolumes.join("、")} |`,
  `| 转录质量待核 | ${summary.emptyTranscriptFragments}空片段；${summary.duplicatedLeafMarkers}个重复叶码影响${summary.ambiguousTranscriptFragments}片段 |`,
  `| 影像/文本链接 | ${summary.verifiedScanTextLinks}条依据既有叶码核对；${summary.candidateScanTextLinks}条按锚点偏移推测，须回看影像 |`,
  `| 图像形态候选 | ${summary.landscapeOrSpreadCandidates}页宽幅或跨页候选；嵌入文本层${summary.embeddedTextLayerPages}页 |`, "",
  `${summary.scanPages}是扫描页数，${summary.transcriptFragments}是转录标记片段数，两者不是一一对应。没有把转录片段、目录登记或下载完成计入校勘。卷类路由也不表示已逐页辨认正文、表格或留白。`, "",
  "## 已固定的来源与缺口", "",
  `- [Kanripo转录固定提交](${corpus.manifest.repository}/tree/${corpus.manifest.revision})；逐文件URL、卷题、字节数及SHA-256见[文本清单](sources/classical-texts/manifest.json)。`,
  "- 文件编号014实际卷题是卷十五，后续编号相应偏移；以卷题而非文件名决定卷号。卷十四影像已缓存，转录缺失需要单独补录。",
  "- 重复叶码的每个出现均保留独立片段ID，不自动择一，也不建立确定的扫描页链接。",
  `- 已核对影像中${summary.reviewedScansWithoutTextFragments.length}页没有唯一对应转录片段：${summary.reviewedScansWithoutTextFragments.join("、")}；不得用邻页补作确定链接。`,
  "- 空片段可能是遗漏图表、漏录正文或留白，必须看原图；不能据空文本推断没有规则。",
  "- 原始影像缓存位于忽略目录 `build/sources/classical/facsimiles/`；未提交原始二进制。仓库保存[原始字节与分页结构记录](sources/classical-scan-layout.json)，支持重建核查。", "",
  "## 分册清单", "", "| 影像册ID | 卷 | 扫描页 | 已登记核对页 |", "|---|---|---:|---:|",
  ...catalog.files.map(file => `| ${file.id} | ${file.volumes.join("、")} | ${file.pageCount} | ${ledger.reviewedPages.filter(page => page.fileId === file.id).length} |`), "",
  "## 执行与检索", "", "```sh",
  "node tools/prepare-classical-sources.mjs --text --facsimiles",
  "node tools/prepare-classical-sources.mjs --text --facsimiles --offline",
  "node tools/index-classical-sources.mjs --check",
  'node tools/search-classical-sources.mjs "游祸" --volumes 6,10,12,36 --context 1',
  "node tools/search-classical-sources.mjs --family VOLUME06_REMAINDER --limit 20 --json",
  "```", "",
  "检索返回所在页及相邻转录片段、关键限制标签、原叶码、确定/候选扫描链接和原始文本地址；简繁及异体检索仅采用明确列出的有限字形归并，不宣称通用转换。", "",
  "[分页JSONL](sources/classical-page-index.jsonl)、[文本片段索引](sources/classical-text-index.jsonl)、[统计JSON](sources/classical-index-summary.json)、[规则族队列](sources/classical-review-queue.json)。", "",
  "队列先处理卷六余项、等第例外、互注、公规与辨讹；年/月/日表须先核定推算口径，再逐格比对。队列只是检索导航，没有替代底本判断、算法实现或发布验收。", ""];
const outputs = new Map([
  ["docs/sources/classical-page-index.jsonl", pageIndexText],
  ["docs/sources/classical-text-index.jsonl", texts.map(page => JSON.stringify(page)).join("\n") + "\n"],
  ["docs/sources/classical-index-summary.json", JSON.stringify(summary, null, 2) + "\n"],
  ["docs/sources/classical-review-queue.json", JSON.stringify(queue, null, 2) + "\n"],
  ["docs/CLASSICAL_INDEX.md", lines.join("\n")]
]);
for (const [path, value] of outputs) {
  if (check) assert.equal((await readFile(resolve(root, path), "utf8")).replaceAll("\r\n", "\n"), value, `${path} is stale; regenerate the index`);
  else await writeFile(resolve(root, path), value);
}
console.log(JSON.stringify({ mode: check ? "checked" : "generated", ...summary }));
