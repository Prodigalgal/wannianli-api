import contract from "../../src/main/resources/api/contract.json" with { type: "json" };
import { ApiError, calculationInstant } from "./request.js";

export { contract };
export const V2_PATH = "/api/v2/almanac";
export const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export function semanticInstant(input) {
  if (!isObject(input) || Object.keys(input).some(k => !Object.hasOwn(contract.inputSchema.properties, k))) {
    throw new ApiError(400, "仅接受calendar、date、time和leapMonth参数");
  }
  const { calendar = "gregorian", date, time = "00:00:00", leapMonth = false } = input;
  if (!["gregorian", "lunar"].includes(calendar)) throw new ApiError(400, "calendar必须为gregorian或lunar");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(date)) throw new ApiError(400, "date必须为YYYY-MM-DD");
  if (typeof time !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u.test(time)) {
    throw new ApiError(400, "time必须为HH:mm或HH:mm:ss，不接受时区偏移或闰秒");
  }
  if (typeof leapMonth !== "boolean") throw new ApiError(400, "leapMonth必须为布尔值");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  return calculationInstant(new Map(Object.entries({ 历法: calendar === "lunar" ? "农历" : "公历",
    年: year, 月: month, 日: day, 时: hour, 分: minute, 秒: second, 是否闰月: leapMonth ? "是" : "否" })));
}

export function queryInput(url) {
  if (url.search.length > 1024 || /%(?![\da-f]{2})/iu.test(url.search)) throw new ApiError(400, "查询参数编码或长度无效");
  const result = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(result, key)) throw new ApiError(400, "查询参数不能重复");
    if (key === "leapMonth" && value !== "true" && value !== "false") throw new ApiError(400, "leapMonth必须为true或false");
    result[key] = key === "leapMonth" ? value === "true" : value;
  }
  return result;
}

export function semanticResult(legacy) {
  const convert = (value, root = false) => {
    if (Array.isArray(value)) return value.map(v => convert(v));
    if (isObject(value)) return Object.fromEntries(Object.entries(value).map(([key, child]) => {
      const name = root && key === "冲煞" ? "clash" : contract.fieldNames[key];
      if (!name) throw new Error("Unmapped public result field");
      return [name, contract.booleanKeys.includes(name) ? child === "是" : convert(child)];
    }));
    return value;
  };
  const result = { schemaVersion: "2.0", utcOffset: "+08:00", scope: contract.resultScope, ...convert(legacy, true) };
  const grade = Object.entries(contract.capabilities.dayGrades).find(([, label]) => label === result.activities.dayGrade)?.[0];
  if (!grade) throw new Error("Unmapped public day grade");
  result.activities.dayGradeCode = grade;
  return result;
}

export function errorBody(status, message) {
  const code = ({ 400: "INVALID_REQUEST", 403: "FORBIDDEN_ORIGIN", 404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED",
    406: "NOT_ACCEPTABLE", 408: "REQUEST_TIMEOUT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE",
    429: "RATE_LIMITED", 431: "HEADERS_TOO_LARGE", 503: "SERVICE_UNAVAILABLE" })[status] ?? "INTERNAL_ERROR";
  return { error: { code, message } };
}

export function openApi() {
  const error = { description: "错误；error.code为稳定机器码，error.message为说明", content: { "application/json": {
    schema: { type: "object", required: ["error"], properties: { error: { type: "object", required: ["code", "message"],
      properties: { code: { type: "string" }, message: { type: "string" } } } } } } } };
  const responses = (schema) => Object.fromEntries([["200", { description: "成功", content: { "application/json": { schema } } }],
    ...[400, 405, 408, 413, 415, 429, 503, 500].map(status => [String(status), error])]);
  const parameters = Object.entries(contract.inputSchema.properties).map(([name, schema]) => ({ name, in: "query", required: name === "date", schema }));
  const api = { openapi: "3.1.0", info: { title: "万年历 API", version: contract.serverInfo.version, description: "公历/农历计算；固定UTC+08:00。农历日期使用所选历法的年月日。神煞为已校勘子集，范围与限制见capabilities。v1继续兼容。" },
    servers: [{ url: "/" }], paths: {
      [V2_PATH]: { get: { operationId: "calculateAlmanacByQuery", summary: "计算指定日期", parameters, responses: responses(contract.outputSchema) },
        post: { operationId: "calculateAlmanac", summary: "计算指定日期", requestBody: { required: true,
          content: { "application/json": { schema: contract.inputSchema, example: { date: "2026-08-03", time: "12:30:15" } } } }, responses: responses(contract.outputSchema) } },
      [V2_PATH + "/now"]: { get: { operationId: "getCurrentAlmanac", summary: "获取当前时刻", responses: responses(contract.outputSchema) } },
      [V2_PATH + "/capabilities"]: { get: { operationId: "getCalendarCapabilities", summary: "支持范围、默认值与计算口径", responses: responses({ type: "object" }) } },
      [V2_PATH + "/openapi.json"]: { get: { operationId: "getOpenApi", summary: "本接口描述", responses: responses({ type: "object" }) } }
    } };
  const rangeParameters = Object.entries(contract.rangeInputSchema.properties).map(([name, schema]) =>
    ({ name, in: "query", required: name !== "time", schema }));
  api.paths[V2_PATH + "/range"] = {
    get: { operationId: "calculateAlmanacRangeByQuery", summary: "计算含首尾最多14天的公历区间", parameters: rangeParameters, responses: responses(contract.rangeOutputSchema) },
    post: { operationId: "calculateAlmanacRange", summary: "计算有界公历区间", requestBody: { required: true,
      content: { "application/json": { schema: contract.rangeInputSchema } } }, responses: responses(contract.rangeOutputSchema) }
  };
  for (const path of Object.values(api.paths)) {
    if (!path.get) continue;
    path.head = { operationId: path.get.operationId + "Headers", summary: path.get.summary + "（仅响应头）",
      ...(path.get.parameters ? { parameters: path.get.parameters } : {}),
      responses: Object.fromEntries(Object.keys(path.get.responses).map(status => [status, { description: "仅响应头，无响应体" }])) };
  }
  return api;
}
