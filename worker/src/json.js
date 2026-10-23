import { ApiError } from "./request.js";

// Bounded recursive grammar with duplicate detection before constructing any object.
// This parser is separate from the intentionally stricter, flat v1 grammar.
export function parseBoundedJson(text) {
  let offset = 0, nodes = 0, fields = 0;
  const fail = () => { throw new ApiError(400, "JSON无效、字段重复或结构超出限制"); };
  const ws = () => { while (/[\x20\t\r\n]/u.test(text[offset] ?? "")) offset++; };
  const string = () => {
    const token = /^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/u.exec(text.slice(offset))?.[0];
    if (!token) fail();
    offset += token.length;
    const value = JSON.parse(token);
    if (value.length > 4096 || /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value)) fail();
    return value;
  };
  const value = (depth) => {
    ws();
    if (depth > 12 || ++nodes > 1024) fail();
    if (text[offset] === '"') return string();
    if (text[offset] === "{" || text[offset] === "[") {
      const object = text[offset++] === "{";
      const result = object ? Object.create(null) : [];
      const end = object ? "}" : "]";
      ws();
      if (text[offset] !== end) while (true) {
        ws();
        if (object) {
          const key = string(); ws();
          if (key.length > 128 || ++fields > 256 || Object.hasOwn(result, key)
              || ["__proto__", "prototype", "constructor"].includes(key) || text[offset++] !== ":") fail();
          result[key] = value(depth + 1);
        } else result.push(value(depth + 1));
        ws();
        if (text[offset] !== ",") break;
        offset++;
      }
      if (text[offset++] !== end) fail();
      return result;
    }
    for (const [token, result] of [["true", true], ["false", false], ["null", null]]) {
      if (text.startsWith(token, offset)) { offset += token.length; return result; }
    }
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/u.exec(text.slice(offset))?.[0];
    if (!number || number.length > 24 || !Number.isFinite(Number(number))) fail();
    offset += number.length;
    return Number(number);
  };
  const result = value(0); ws();
  if (offset !== text.length) fail();
  return result;
}
