import assert from "node:assert/strict";

// Read the bundled IFF container only. This does not decode pixels, OCR text, or infer a blank page.
export function inspectDjvu(data) {
  assert.ok(data.length >= 16 && data.subarray(0, 8).toString("ascii") === "AT&TFORM", "Not a DjVu IFF file");
  const end = data.readUInt32BE(8) + 12;
  assert.equal(end, data.length, "Truncated or trailing DjVu data");
  assert.equal(data.toString("ascii", 12, 16), "DJVM", "Expected a bundled multipage DjVu");
  const pages = [];
  function chunks(start, limit) {
    const entries = [];
    for (let offset = start; offset < limit;) {
      assert.ok(offset + 8 <= limit, "Truncated IFF chunk header");
      const type = data.toString("ascii", offset, offset + 4), length = data.readUInt32BE(offset + 4);
      assert.ok(offset + 8 + length <= limit, "IFF chunk exceeds parent");
      entries.push({ type, offset, length });
      offset += 8 + length + (length % 2);
      assert.ok(offset <= limit + 1, "IFF padding exceeds parent");
    }
    return entries;
  }
  for (const form of chunks(16, end)) {
    if (form.type !== "FORM" || data.toString("ascii", form.offset + 8, form.offset + 12) !== "DJVU") continue;
    assert.ok(form.length >= 4, "Truncated page FORM");
    const entries = chunks(form.offset + 12, form.offset + 8 + form.length);
    const info = entries.find(chunk => chunk.type === "INFO");
    assert.ok(info && info.length >= 4, "Page lacks dimensions");
    const width = data.readUInt16BE(info.offset + 8), height = data.readUInt16BE(info.offset + 10);
    assert.ok(width > 0 && height > 0, "Invalid page dimensions");
    pages.push({ scanPage: pages.length + 1, width, height, bytes: form.length + 8,
      hasTextLayer: entries.some(chunk => ["TXTa", "TXTz"].includes(chunk.type)) });
  }
  assert.ok(pages.length, "No page FORM found");
  return pages;
}
