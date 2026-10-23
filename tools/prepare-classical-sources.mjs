import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inspectDjvu } from "./lib/djvu-pages.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const textDirectory = resolve(root, "docs/sources/classical-texts");
const cacheDirectory = resolve(root, "build/sources/classical/facsimiles");
const revision = "8b5522eb0299afbd575f1cb556e972c71c40c42a";
const repository = "kanripo/KR3g0051";
const args = new Set(process.argv.slice(2));
assert.ok([...args].every(arg => ["--text", "--facsimiles", "--offline"].includes(arg)),
  "Usage: node tools/prepare-classical-sources.mjs [--text] [--facsimiles] [--offline]");
assert.ok(args.has("--text") || args.has("--facsimiles"), "Select --text or --facsimiles");
const hash = (data, algorithm = "sha256") => createHash(algorithm).update(data).digest("hex");
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function download(url, maximumBytes) {
  assert.ok(!args.has("--offline"), `Missing cache in offline mode: ${url}`);
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000),
      headers: { "user-agent": "wannianli-source-collation/1.0 (https://github.com/Prodigalgal/wannianli-api)" } });
    if ([429, 502, 503, 504].includes(response.status) && attempt < 3) {
      const retry = response.headers.get("retry-after");
      const delay = Math.max(30000, /^\d+$/u.test(retry ?? "") ? Number(retry) * 1000 : Date.parse(retry ?? "") - Date.now() || (attempt + 1) * 30000);
      console.error(`HTTP ${response.status}; respecting retry delay ${Math.ceil(delay / 1000)}s`);
      await sleep(delay); continue;
    }
    assert.ok(response.ok, `HTTP ${response.status}: ${url}`);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length; assert.ok(size <= maximumBytes, `Download exceeds byte limit: ${url}`); chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  throw new Error(`Download failed: ${url}`);
}

async function existing(path) {
  try { return await readFile(path); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function atomicWrite(path, data) {
  await writeFile(path + ".part", data);
  await rename(path + ".part", path);
}

if (args.has("--text")) {
  await mkdir(textDirectory, { recursive: true });
  const manifestPath = resolve(textDirectory, "manifest.json");
  const oldBytes = await existing(manifestPath);
  const old = oldBytes ? JSON.parse(oldBytes) : null;
  if (old) assert.equal(old.revision, revision, "Source revision changed; review the lock before updating");
  const entries = [];
  for (let number = 0; number <= 35; number++) {
    const filename = `KR3g0051_${String(number).padStart(3, "0")}.txt`;
    const url = `https://raw.githubusercontent.com/${repository}/${revision}/${filename}`;
    const path = resolve(textDirectory, filename);
    let data = await existing(path);
    const prior = old?.files.find(file => file.file === filename);
    if (data && !prior) {
      const pinned = await download(url, 2_000_000);
      assert.equal(hash(data), hash(pinned), `Unregistered cache differs from pinned revision: ${filename}`);
    } else if (!data) { data = await download(url, 2_000_000); await sleep(250); }
    if (prior) assert.equal(hash(data), prior.sha256, `Text snapshot changed: ${filename}`);
    const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
    assert.ok(text.includes("#+PROPERTY: ID KR3g0051") && text.includes("#+PROPERTY: BASEEDITION WYG"), filename);
    const juan = text.match(/^#\+PROPERTY: JUAN (.+)$/mu)?.[1]?.trim();
    assert.ok(juan, `Missing JUAN: ${filename}`);
    const pages = [...text.matchAll(/<pb:([^>]+)>/gu)];
    assert.ok(pages.length, `Missing page markers: ${filename}`);
    if (!await existing(path)) await atomicWrite(path, data);
    entries.push({ file: filename, juan, bytes: data.length, sha256: hash(data),
      pageMarkers: pages.length, sourceUrl: url });
    if (!old?.complete) await atomicWrite(manifestPath, JSON.stringify({ schemaVersion: 1,
      repository: `https://github.com/${repository}`, revision, role: "NAVIGATION_DRAFT", complete: entries.length === 36,
      note: "转录卷题决定卷号，文件编号不等于卷号；空白和漏表不能从电子文本判定原图内容。未对照影像不增加核验页数。", files: entries }, null, 2) + "\n");
    console.log(`Text ${number + 1}/36: ${filename}, ${juan}, ${pages.length} markers; navigation draft only`);
  }
  const manifest = { schemaVersion: 1, repository: `https://github.com/${repository}`, revision,
    role: "NAVIGATION_DRAFT", complete: true, note: "转录卷题决定卷号，文件编号不等于卷号；空白和漏表不能从电子文本判定原图内容。未对照影像不增加核验页数。", files: entries };
  if (!old?.complete) await atomicWrite(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  else assert.deepEqual(manifest, old, "Text manifest is not reproducible");
}

if (args.has("--facsimiles")) {
  const catalog = JSON.parse(await readFile(resolve(root, "docs/sources/classical-catalog.json")));
  await mkdir(cacheDirectory, { recursive: true });
  const files = [], layouts = [];
  for (const file of catalog.files) {
    const path = resolve(cacheDirectory, file.id + ".djvu");
    let data = await existing(path);
    const cached = Boolean(data);
    if (!data) data = await download(file.originalUrl, file.bytes + 1);
    assert.equal(data.length, file.bytes, `Facsimile size changed: ${file.id}`);
    assert.equal(hash(data, "sha1"), file.publishedSha1, `Facsimile identity changed: ${file.id}; review edition before replacing`);
    assert.equal(data.subarray(0, 8).toString("ascii"), "AT&TFORM", `Not DjVu: ${file.id}`);
    const pages = inspectDjvu(data);
    assert.equal(pages.length, file.pageCount, `Actual DjVu page count differs from catalog: ${file.id}`);
    if (!cached) await atomicWrite(path, data);
    files.push({ fileId: file.id, file: `build/sources/classical/facsimiles/${file.id}.djvu`,
      bytes: data.length, sha1: hash(data, "sha1"), sha256: hash(data), pageCount: file.pageCount,
      sourceUrl: file.originalUrl, status: "CACHED_NOT_REVIEWED" });
    layouts.push({ fileId: file.id, bytes: data.length, sha1: hash(data, "sha1"), sha256: hash(data), pages });
    await atomicWrite(resolve(cacheDirectory, "manifest.json"), JSON.stringify({ schemaVersion: 1,
      note: "本地原始文件已按目录公布SHA-1验证；下载不是逐页校勘。", files }, null, 2) + "\n");
    console.log(`Facsimile ${files.length}/${catalog.files.length}: ${file.id}, ${cached ? "cache verified" : "download verified"}; not reviewed`);
    if (!cached) await sleep(1500);
  }
  await atomicWrite(resolve(root, "docs/sources/classical-scan-layout.json"), JSON.stringify({ schemaVersion: 1,
    note: "由本地原始DjVu解析页边界与尺寸；每册SHA-1已与目录公布值匹配。页面结构不是图像内容分类或校勘。", files: layouts }, null, 2) + "\n");
}
