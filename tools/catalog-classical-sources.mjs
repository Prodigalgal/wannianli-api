import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const catalogPath = resolve(root, "docs/sources/classical-catalog.json");
const groups = [[1],[2],[3],[4],[5],[6],[7],[8],[9,10],[11,12],[13],[14],[15],[16,17],[18],[19,20],
  [21,22],[23,24],[25,26],[27,28],[29,30],[31,32],[33],[34],[35],[36]];
const numerals = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
const chinese = n => n <= 10 ? numerals[n] : (n < 20 ? "十" : numerals[Math.floor(n / 10)] + "十") + numerals[n % 10];
async function json(params) {
  let response;
  for (let attempt = 0; attempt < 4; attempt++) {
    response = await fetch("https://commons.wikimedia.org/w/api.php?" + new URLSearchParams({
      action: "query", format: "json", ...params }), { signal: AbortSignal.timeout(30000) });
    if (response.status !== 429) break;
    const header = response.headers.get("retry-after");
    const seconds = header && /^\d+$/u.test(header) ? Number(header) : 30 * (attempt + 1);
    console.error(`Commons rate limit; waiting ${Math.max(seconds,30)} seconds before retry`);
    await new Promise(resolve => setTimeout(resolve, Math.max(seconds,30) * 1000));
  }
  assert.ok(response.ok, `Commons HTTP ${response.status}`);
  const value = await response.json(); assert.ok(!value.error, JSON.stringify(value.error)); return value;
}
if (process.argv.includes("--refresh-catalog")) {
  const titles = groups.map((volumes, i) => `File:CADAL${(6056502 + i).toString().padStart(8, "0")} 欽定協紀辨方書·${volumes.map(v => "卷" + chinese(v)).join("~")}.djvu`);
  const result = await json({ titles: titles.join("|"), prop: "imageinfo", iiprop: "url|size|sha1" });
  const files = titles.map((title, i) => {
    const entry = Object.values(result.query.pages).find(p => p.title === title);
    assert.ok(entry?.imageinfo?.[0], title);
    const info = entry.imageinfo[0];
    assert.ok(info.pagecount > 0 && /^[a-f0-9]{40}$/u.test(info.sha1));
    return { id: "CADAL" + (6056502 + i).toString().padStart(8, "0"), volumes: groups[i], title,
      pageCount: info.pagecount, bytes: info.size, publishedSha1: info.sha1,
      descriptionUrl: info.descriptionurl, originalUrl: info.url.split("?")[0] };
  });
  const value = { retrievedOn: new Date().toISOString().slice(0,10), edition: "四库全书本，CADAL 06056502—06056527同组影像",
    note: "目录登记不代表逐页校勘；publishedSha1是Commons发布值，不是本地原始DjVu下载校验。", files };
  await writeFile(catalogPath, JSON.stringify(value, null, 2) + "\n");
  console.log(JSON.stringify({ files: files.length, volumes: files.flatMap(f => f.volumes).length, pages: files.reduce((n,f) => n + f.pageCount, 0) }));
} else {
  const [volume, ...pages] = process.argv.slice(2).map(Number);
  assert.ok(Number.isInteger(volume) && pages.length && pages.every(Number.isInteger), "Usage: node tools/catalog-classical-sources.mjs <volume> <scan-page> ...");
  const catalog = JSON.parse(await readFile(catalogPath, "utf8")), file = catalog.files.find(f => f.volumes.includes(volume));
  assert.ok(file, "Unknown volume");
  const directory = resolve(root, `build/sources/volume${String(volume).padStart(2,"0")}`);
  await mkdir(directory, { recursive: true });
  for (const page of pages) {
    assert.ok(page >= 1 && page <= file.pageCount, "Page outside catalog");
    const result = await json({ titles: file.title, prop: "imageinfo", iiprop: "url|size|sha1", iiurlwidth: "1800", iiurlparam: "page" + page });
    const info = Object.values(result.query.pages)[0].imageinfo[0];
    assert.equal(info.sha1, file.publishedSha1, "Facsimile changed: review edition before using it");
    const response = await fetch(info.thumburl, { signal: AbortSignal.timeout(30000) });
    assert.ok(response.ok, `Image HTTP ${response.status}`);
    const data = Buffer.from(await response.arrayBuffer());
    await writeFile(resolve(directory, `page${page}.jpg`), data);
    await writeFile(resolve(directory, `meta${page}.json`), JSON.stringify({ ...info, scanPage: page,
      sha256: createHash("sha256").update(data).digest("hex") }, null, 2) + "\n");
    console.log(`Saved volume ${volume}, scan ${page}; image not yet reviewed`);
    await new Promise(resolve => setTimeout(resolve, 4000));
  }
}
