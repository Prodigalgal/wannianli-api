import { formatCivil, instantFromUtcPlus8, parseCivil, utcPlus8CivilDate } from "./astronomy.js";
import { lunarToGregorian } from "./calendar.js";

export const MAX_BODY_BYTES = 1024;
const FIELDS = new Set(["历法", "年", "月", "日", "时", "分", "秒", "是否闰月"]);
const STRING_TOKEN = /^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/u;
const INTEGER_TOKEN = /^-?(?:0|[1-9]\d*)/u;

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const invalidJson = () => new ApiError(400,
  "请求体必须是字段不重复、无嵌套且只含字符串或整数的UTF-8 JSON对象");

// The API accepts a flat, eight-field object. Parse that small grammar explicitly so escaped
// duplicate names are rejected before JSON.parse can silently overwrite them.
export function parseCalculationJson(text) {
  let offset = 0;
  const whitespace = () => { while (/[\x20\t\r\n]/u.test(text[offset] ?? "")) offset++; };
  const consume = (character) => {
    whitespace();
    if (text[offset++] !== character) throw invalidJson();
  };
  const string = (maxLength) => {
    whitespace();
    const token = STRING_TOKEN.exec(text.slice(offset))?.[0];
    if (!token) throw invalidJson();
    offset += token.length;
    const value = JSON.parse(token);
    if (value.length > maxLength) throw invalidJson();
    return value;
  };
  consume("{");
  whitespace();
  const fields = new Map();
  if (text[offset] !== "}") {
    while (true) {
      const name = string(32);
      if (fields.has(name) || fields.size >= 8) throw invalidJson();
      consume(":");
      whitespace();
      let value;
      if (text[offset] === '"') {
        value = string(128);
      } else {
        const token = INTEGER_TOKEN.exec(text.slice(offset))?.[0];
        if (!token || token.length > 10) throw invalidJson();
        offset += token.length;
        value = Number(token);
        if (!Number.isSafeInteger(value) || value < -2_147_483_648 || value > 2_147_483_647) throw invalidJson();
      }
      fields.set(name, value);
      whitespace();
      if (text[offset] !== ",") break;
      offset++;
    }
  }
  consume("}");
  whitespace();
  if (offset !== text.length) throw invalidJson();
  for (const name of fields.keys()) {
    if (!FIELDS.has(name)) throw new ApiError(400, "请求包含不支持的参数");
  }
  return fields;
}

export async function readBoundedBody(request, maxBytes = MAX_BODY_BYTES) {
  const reader = request.body?.getReader();
  if (!reader) throw invalidJson();
  let timer;
  const read = async () => {
    const chunks = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new ApiError(413, `请求体不能超过${maxBytes}字节`);
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let position = 0;
      for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
      try {
        return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
      } catch {
        throw invalidJson();
      }
    } catch (error) {
      void reader.cancel().catch(() => {});
      throw error;
    } finally {
      reader.releaseLock();
    }
  };
  try {
    return await Promise.race([read(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new ApiError(408, "读取请求体超时")), 5000);
    })]);
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function readCalculationInstant(request) {
  return calculationInstant(parseCalculationJson(await readBoundedBody(request)));
}

export function calculationInstant(fields) {
  const calendar = fields.get("历法");
  if (calendar !== "公历" && calendar !== "农历") throw new ApiError(400, "历法必须为公历或农历");
  const integer = (name, minimum, maximum, defaultValue) => {
    const value = fields.has(name) ? fields.get(name) : defaultValue;
    if (!Number.isInteger(value)) throw new ApiError(400, `${name}必须为整数`);
    if (value < minimum || value > maximum) throw new ApiError(400, `${name}必须在${minimum}至${maximum}之间`);
    return value;
  };
  const year = integer("年", calendar === "农历" ? 1800 : 1801, 2199);
  const month = integer("月", 1, 12);
  const day = integer("日", 1, calendar === "农历" ? 30 : 31);
  const hour = integer("时", 0, 23, 0);
  const minute = integer("分", 0, 59, 0);
  const second = integer("秒", 0, 59, 0);
  const leap = fields.has("是否闰月") ? fields.get("是否闰月") : "否";
  if (leap !== "是" && leap !== "否") throw new ApiError(400, "是否闰月必须为是或否");
  if (calendar === "公历" && leap === "是") throw new ApiError(400, "公历不支持闰月");
  let civil;
  if (calendar === "农历") {
    try {
      civil = parseCivil(lunarToGregorian(year, month, day, leap === "是"));
    } catch (error) {
      if (error instanceof RangeError) throw new ApiError(400, error.message);
      throw error;
    }
  } else {
    const date = formatCivil(year, month, day);
    if (utcPlus8CivilDate(instantFromUtcPlus8(year, month, day)) !== date) {
      throw new ApiError(400, "公历日期不存在");
    }
    civil = { year, month, day };
  }
  return instantFromUtcPlus8(civil.year, civil.month, civil.day, hour, minute, second);
}
