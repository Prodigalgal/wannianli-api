import assert from "node:assert/strict";

export function decimalYear(date) {
  const year = date.getUTCFullYear();
  return year + (+date - Date.UTC(year, 0, 1)) / (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1));
}

export function parseObserved(text) {
  const rows = text.trim().split(/\r?\n/u).map(line => {
    assert.match(line.trim(), /^\d{4}\s+\d{1,2}\s+\d{1,2}\s+-?\d+(?:\.\d+)?$/u, "Malformed USNO observation");
    const [year, month, day, seconds] = line.trim().split(/\s+/u).map(Number);
    assert.ok(Number.isFinite(seconds), "Nonfinite USNO observation");
    const date = new Date(Date.UTC(year, month - 1, day));
    assert.ok(date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && day === 1,
      "USNO monthly date must be a real first day");
    return { date: date.toISOString().slice(0,10), decimalYear: decimalYear(date), seconds };
  });
  for (let i = 1; i < rows.length; i++) {
    const previous = new Date(rows[i-1].date + "T00:00:00Z"); previous.setUTCMonth(previous.getUTCMonth() + 1);
    assert.equal(rows[i].date, previous.toISOString().slice(0,10), "Duplicate, reordered or missing USNO month");
  }
  return rows;
}

export function parsePredictions(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/u);
  assert.match(header, /^MJD\s+Year\s+TT-UT\s+UT1-UTC\s+Error$/u, "Unexpected USNO prediction columns");
  const rows = lines.map(line => {
    // Preserve the optional fourth column; splitting on arbitrary whitespace would move Error into UT1-UTC.
    const match = line.trimEnd().match(/^\s*(\d+\.\d+)\s+(\d{4}\.\d+)\s+(-?\d+\.\d+)[ \t]+(?:(-?\d+\.\d+)[ \t]+)?(\d+(?:\.\d+)?)$/u);
    assert.ok(match, "Malformed USNO prediction row");
    const [, mjdText, labelText, secondsText, utText, errorText] = match;
    const mjd = Number(mjdText), yearLabel = Number(labelText);
    const date = new Date((mjd - 40587) * 86400000), year = decimalYear(date);
    assert.ok(Math.abs(year - yearLabel) < 0.005, "MJD and nominal quarter disagree");
    return { date: date.toISOString().slice(0,10), mjd, yearLabel, decimalYear: year, seconds: Number(secondsText),
      ut1MinusUtc: utText === undefined ? null : Number(utText), sourceError: Number(errorText) };
  });
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].mjd > rows[i-1].mjd, "Duplicate or reordered prediction");
  return rows;
}
