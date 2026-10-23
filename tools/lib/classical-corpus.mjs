import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

export const sha256 = data => createHash("sha256").update(data).digest("hex");
export const navigationFingerprint = sources => sha256(JSON.stringify(sources));
export function verifyNavigationIndex(summary, sources, indexText) {
  assert.equal(summary.sourceFingerprint, navigationFingerprint(sources), "Navigation sources changed; rebuild the index before searching");
  assert.equal(summary.pageIndexSha256, sha256(indexText.replaceAll("\r\n", "\n")), "Navigation page index changed; rebuild before searching");
}
export const expectedVolumes = Array.from({ length: 36 }, (_, i) => i + 1);
const digits = "零一二三四五六七八九";

export function volumeNumber(juan) {
  if (!juan.startsWith("卷")) return 0;
  const value = juan.slice(1);
  assert.match(value, /^[一二三四五六七八九十]+$/u, `Unsupported volume title: ${juan}`);
  if (!value.includes("十")) return digits.indexOf(value);
  const [tens, units] = value.split("十");
  const number = (tens ? digits.indexOf(tens) : 1) * 10 + (units ? digits.indexOf(units) : 0);
  assert.ok(number >= 1 && number <= 36, juan); return number;
}

export function leafOrdinal(leaf) {
  const match = leaf.match(/^(\d+)([ab])$/u);
  assert.ok(match, `Unsupported leaf: ${leaf}`);
  return 2 * Number(match[1]) - (match[2] === "a" ? 1 : 0);
}

export function parseTranscription(text, entry) {
  const juan = text.match(/^#\+PROPERTY: JUAN (.+)$/mu)?.[1]?.trim();
  assert.equal(juan, entry.juan, `Volume metadata changed: ${entry.file}`);
  const volume = volumeNumber(juan);
  const matches = [...text.matchAll(/<pb:(KR3g0051_WYG_\d{3}-(\d+[ab]))>/gu)];
  assert.equal(matches.length, entry.pageMarkers, `Page marker count changed: ${entry.file}`);
  const counts = new Map(), seen = new Map();
  for (const match of matches) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  return matches.map((match, index) => {
    const occurrence = (seen.get(match[1]) ?? 0) + 1; seen.set(match[1], occurrence);
    const ambiguousLeaf = counts.get(match[1]) > 1;
    const raw = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length);
    const lines = raw.replaceAll("¶", "").split(/\r?\n/u).map(line => line.trimEnd());
    return { id: match[1] + (ambiguousLeaf ? `#${occurrence}` : ""), marker: match[1], ambiguousLeaf,
      file: entry.file, volume, leaf: match[2],
      sourceLine: text.slice(0, match.index).split("\n").length, text: lines.join("\n").trim(),
      sourceUrl: entry.sourceUrl };
  });
}

export function volumeRoute(volume) {
  if (volume === 0) return "FRONT_MATTER";
  if (volume <= 2) return "FOUNDATIONS";
  if (volume <= 8) return "RULE_DEFINITIONS";
  if (volume === 9) return "REFERENCE_TABLES";
  if (volume === 10) return "ACTIVITY_RULES";
  if (volume === 11) return "ACTIVITY_PROCEDURES";
  if (volume <= 13) return "GENERAL_CONVENTIONS";
  if (volume <= 19) return "YEAR_TABLES";
  if (volume <= 31) return "MONTH_TABLES";
  if (volume === 32) return "DAY_TABLES";
  if (volume <= 34) return "APPLICATIONS";
  if (volume === 35) return "APPENDIX";
  return "CORRECTIONS";
}

// These flags locate passages for review; they never create classical rules or verified page types.
export function textFlags(text, volume) {
  const flags = [];
  const folded = searchFold(text);
  if (!/[\p{Script=Han}\d]/u.test(text)) flags.push("EMPTY_TRANSCRIPT_REVIEW_IMAGE");
  if (/按|今考|今订|今定|辨正/u.test(folded)) flags.push("COMMENTARY");
  if (/不用|不取|不可信|未当|未妥|无义|无理|非是|妄|谬|删/u.test(folded)) flags.push("REJECTED_OLD_THEORY_CANDIDATE");
  if (/惟|唯|但|除|不注|仍忌|犹忌|不得|不宜|不忌/u.test(folded)) flags.push("EXCEPTION_CANDIDATE");
  if (/与.{0,30}并|同日|同位|相逢|相会/u.test(folded)) flags.push("COMBINATION_CANDIDATE");
  if (["REFERENCE_TABLES", "YEAR_TABLES", "MONTH_TABLES", "DAY_TABLES"].includes(volumeRoute(volume))) flags.push("TABLE_VOLUME_CANDIDATE");
  if (/目録|目錄/u.test(text)) flags.push("CONTENTS_CANDIDATE");
  return flags;
}

export async function loadCorpus(root) {
  const directory = resolve(root, "docs/sources/classical-texts");
  const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json")));
  assert.equal(manifest.complete, true, "Finish fetching pinned text snapshots first");
  assert.equal(manifest.role, "NAVIGATION_DRAFT");
  const pages = [], volumes = new Set(), names = new Set();
  for (const entry of manifest.files) {
    assert.match(entry.file, /^KR3g0051_\d{3}\.txt$/u);
    assert.ok(!names.has(entry.file), `Duplicate transcript: ${entry.file}`); names.add(entry.file);
    const data = await readFile(resolve(directory, entry.file));
    assert.equal(data.length, entry.bytes, entry.file); assert.equal(sha256(data), entry.sha256, entry.file);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    const parsed = parseTranscription(text, entry);
    if (parsed[0].volume) {
      assert.ok(!volumes.has(parsed[0].volume), `Duplicate volume: ${entry.juan}`); volumes.add(parsed[0].volume);
    }
    pages.push(...parsed);
  }
  return { manifest, pages, missingVolumes: expectedVolumes.filter(volume => !volumes.has(volume)) };
}

export function buildPageIndex(catalog, ledger, corpus, layout) {
  assert.equal(ledger.defaultStatus, "NOT_REVIEWED");
  assert.deepEqual(catalog.files.flatMap(file => file.volumes), expectedVolumes, "Catalog must cover each volume exactly once");
  assert.deepEqual(layout.files.map(file => file.fileId), catalog.files.map(file => file.id), "Scan layout/catalog differ");
  const reviewed = new Map(), sourcePages = new Map(corpus.pages.filter(page => !page.ambiguousLeaf).map(page => [`${page.volume}/${page.leaf}`, page]));
  const offsets = new Map(), warnings = [];
  for (const page of ledger.reviewedPages) {
    const file = catalog.files.find(file => file.id === page.fileId);
    assert.ok(file?.volumes.includes(page.volume), "Ledger volume/file mismatch");
    assert.ok(Number.isInteger(page.scanPage) && page.scanPage >= 1 && page.scanPage <= file.pageCount);
    assert.ok(["RULE_COLLATION", "TABLE_TRANSCRIBED"].includes(page.status), "Unknown review status");
    const id = `${page.fileId}/${page.scanPage}`;
    assert.ok(!reviewed.has(id), `Duplicate review: ${id}`); reviewed.set(id, page);
    const key = `${page.fileId}/${page.volume}`, offset = page.scanPage - leafOrdinal(page.leaf);
    if (!offsets.has(key)) offsets.set(key, new Set()); offsets.get(key).add(offset);
  }
  for (const [key, values] of offsets) if (values.size > 1) warnings.push(`NONLINEAR_LEAF_MAPPING:${key}`);
  const records = [];
  for (const file of catalog.files) {
    const physical = layout.files.find(entry => entry.fileId === file.id);
    assert.equal(physical.sha1, file.publishedSha1, "Layout belongs to another facsimile");
    assert.equal(physical.bytes, file.bytes, "Layout source size differs");
    assert.equal(physical.pages.length, file.pageCount, "Physical/catalog page counts differ");
    for (let scanPage = 1; scanPage <= file.pageCount; scanPage++) {
      const geometry = physical.pages[scanPage - 1];
      assert.equal(geometry.scanPage, scanPage, "Missing, repeated or reordered physical page");
      assert.ok(Number.isInteger(geometry.width) && Number.isInteger(geometry.height) && geometry.width > 0 && geometry.height > 0);
      const id = `${file.id}/${scanPage}`, review = reviewed.get(id);
      const exact = review ? sourcePages.get(`${review.volume}/${review.leaf}`) : undefined;
      const candidates = [];
      for (const volume of file.volumes) {
        const values = offsets.get(`${file.id}/${volume}`);
        if (values?.size !== 1) continue;
        const ordinal = scanPage - [...values][0];
        if (ordinal < 1) continue;
        const leaf = `${Math.ceil(ordinal / 2)}${ordinal % 2 ? "a" : "b"}`;
        const page = sourcePages.get(`${volume}/${leaf}`);
        if (page && !review) candidates.push({ textPageId: page.id, volume, leaf, method: "OFFSET_FROM_REVIEWED_ANCHORS_NOT_VERIFIED" });
      }
      records.push({ id, fileId: file.id, scanPage, candidateVolumes: file.volumes,
        routeHints: [...new Set(file.volumes.map(volumeRoute))], classificationStatus: "NOT_CLASSIFIED",
        geometryHints: geometry.width >= geometry.height ? ["LANDSCAPE_OR_SPREAD_CANDIDATE"] : [],
        width: geometry.width, height: geometry.height, embeddedTextLayer: geometry.hasTextLayer,
        reviewStatus: review?.status ?? "NOT_REVIEWED", verifiedVolume: review?.volume ?? null,
        verifiedLeaf: review?.leaf ?? null, exactTextPageId: exact?.id ?? null,
        candidateTextPages: candidates, reviewedImage: review?.image ?? null,
        sourceUrl: `${file.descriptionUrl}?page=${scanPage}` });
    }
  }
  const byTextId = new Map(records.filter(page => page.exactTextPageId).map(page => [page.exactTextPageId, page.id]));
  const texts = corpus.pages.map(page => ({ id: page.id, volume: page.volume, leaf: page.leaf,
    file: page.file, line: page.sourceLine, routeHint: volumeRoute(page.volume),
    textStatus: "NAVIGATION_DRAFT", flags: [...textFlags(page.text, page.volume), ...(page.ambiguousLeaf ? ["AMBIGUOUS_LEAF_MARKER"] : [])],
    verifiedScanId: byTextId.get(page.id) ?? null }));
  return { records, texts, warnings };
}

export async function verifyLedgerImages(root, ledger) {
  for (const page of ledger.reviewedPages) {
    const path = resolve(root, page.image);
    assert.ok(path.startsWith(resolve(root, "docs/sources") + sep), "Ledger image outside source directory");
    assert.equal(sha256(await readFile(path)), page.sha256, `Reviewed image changed: ${page.image}`);
  }
}

// Deliberately limited spelling fold for source navigation, not a general Simplified/Traditional converter.
const pairs = ["游遊", "祸禍", "贼賊", "归歸", "气氣", "绝絶絕", "离離", "阳陽", "阴隂陰", "德徳", "岁嵗歲", "阵陣", "历厯曆歷", "厌厭", "会㑹會", "仓倉", "库庫", "纳納", "财財", "货貨", "为為爲", "书書", "纪紀", "辩辨辯", "规規", "讹訛譌", "临臨", "驿驛", "马馬", "后後", "护護䕶", "圣聖", "续續", "愿願", "词詞", "讼訟", "师師", "门門", "时時", "丧喪", "启啓啟", "攒攢", "虽雖", "医醫", "无無", "禄祿", "毁毀", "开開", "将將", "诸諸", "结結", "满滿", "执執", "闭閉閇", "床牀", "头頭", "注註", "并並併", "当當", "谬謬", "义義", "与與", "犹猶", "删刪", "订訂"];
const fold = new Map(pairs.flatMap(pair => [...pair].map(char => [char, [...pair][0]])));
export const searchFold = text => [...text.normalize("NFC")].map(char => fold.get(char) ?? char).join("").replace(/\s+/gu, "");

export function searchPages(corpus, terms, volumes = []) {
  assert.ok(terms.length && terms.every(term => term.trim()), "At least one nonempty search term is required");
  const needles = terms.map(term => [term, ...(["搬移", "般移"].includes(term) ? ["搬移", "般移"] : [])].map(searchFold));
  return corpus.pages.filter(page => (!volumes.length || volumes.includes(page.volume)) &&
    needles.every(alternatives => alternatives.some(term => searchFold(page.text).includes(term))));
}
