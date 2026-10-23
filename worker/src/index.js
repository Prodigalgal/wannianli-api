import { calculateCurrentAlmanac } from "./engine.js";
import { ApiError, readCalculationInstant, readBoundedBody } from "./request.js";
import { checkRequestHeaders, RequestGuard } from "./security.js";
import { parseBoundedJson } from "./json.js";
import { contract, V2_PATH, queryInput, semanticInstant, semanticResult, errorBody, openApi } from "./semantic.js";
import { MCP_MAX_BYTES, mcpRequest, rpcError, validOrigin } from "./mcp.js";
import { rangeResult } from "./range.js";

const API_PATH = "/api/v1/almanac/current";
const ALLOWED_PATHS = new Set(["/", API_PATH]);
const CALCULATE_PATH = "/api/v1/almanac/calculate";
const V2_PATHS = new Set([V2_PATH, V2_PATH + "/range", V2_PATH + "/now", V2_PATH + "/capabilities", V2_PATH + "/openapi.json"]);
const defaultGuard = new RequestGuard();

function jsonResponse(value, status, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("content-security-policy", "default-src 'none'; frame-ancestors 'none'");
  headers.set("referrer-policy", "no-referrer");
  headers.set("x-wannianli-runtime", "cloudflare-worker-standalone");
  return new Response(value === null ? null : JSON.stringify(value), { status, headers });
}

export async function handleRequest(request, nowProvider = () => new Date(), { guard = defaultGuard, rateLimiter } = {}) {
  const url = new URL(request.url);
  const calculation = url.pathname === CALCULATE_PATH;
  const range = url.pathname === V2_PATH + "/range";
  const v2 = V2_PATHS.has(url.pathname), mcp = url.pathname === "/mcp";
  const semantic = v2 || mcp || url.pathname.startsWith("/api/v2/");
  const rpcBody = body => {
    if (body?.error && body.id === null && request.headers.get("mcp-protocol-version") === contract.protocolVersions[0]) delete body.id;
    return body;
  };
  const rejected = (status, message, headers = {}) => jsonResponse(request.method === "HEAD" ? null
    : mcp ? rpcBody(rpcError(-32000, message)) : semantic ? errorBody(status, message) : { "错误": message }, status, headers);
  if (!calculation && !ALLOWED_PATHS.has(url.pathname) && !v2 && !mcp) {
    if (semantic) return rejected(404, "接口不存在");
    return jsonResponse(request.method === "HEAD" ? null : { "错误": "接口不存在" }, 404);
  }
  const methods = calculation || mcp ? ["POST"] : url.pathname === V2_PATH || range ? ["GET", "HEAD", "POST"] : ["GET", "HEAD"];
  if (mcp && !validOrigin(request.headers.get("origin"), url)) return rejected(403, "Origin不在允许范围");
  if (!methods.includes(request.method)) return rejected(405, "请求方法不支持", { allow: methods.join(", ") });

  let acquired = false;
  try {
    if (url.search && !((url.pathname === V2_PATH || range) && request.method !== "POST")) throw new ApiError(400, "接口不接受查询参数");
    checkRequestHeaders(request, request.method === "POST", mcp ? MCP_MAX_BYTES : 1024);
    if (mcp) {
      if (!validOrigin(request.headers.get("origin"), url)) throw new ApiError(403, "Origin不在允许范围");
      const accept = request.headers.get("accept") ?? "";
      if (!["application/json", "text/event-stream"].every(type => accept.split(",").some(part => {
        const [media, ...parameters] = part.trim().split(";");
        return media.trim().toLowerCase() === type && !parameters.some(p => /^\s*q\s*=\s*0(?:\.0*)?\s*$/u.test(p));
      }))) throw new ApiError(406, "Accept必须同时包含application/json和text/event-stream");
    }
    guard.acquire();
    acquired = true;
    if (rateLimiter && !(await rateLimiter.limit({ key: "almanac-api" })).success) {
      throw new ApiError(429, "请求过于频繁，请稍后重试");
    }
    const charge = async units => {
      guard.chargeAdditional(units);
      for (let i = 0; i < units && rateLimiter; i++) if (!(await rateLimiter.limit({ key: "almanac-api" })).success)
        throw new ApiError(429, "计算配额不足，请稍后重试");
    };
    if (mcp) { const response = await mcpRequest(request, nowProvider, charge); return jsonResponse(rpcBody(response.body), response.status); }
    if (v2) {
      let value;
      if (range) {
        const input = request.method === "POST" ? parseBoundedJson(await readBoundedBody(request)) : queryInput(url);
        value = await rangeResult(input, charge, request.method === "HEAD");
      } else if (url.pathname === V2_PATH) {
        const input = request.method === "POST" ? parseBoundedJson(await readBoundedBody(request)) : queryInput(url);
        value = semanticResult(calculateCurrentAlmanac(semanticInstant(input)));
      } else if (url.pathname.endsWith("/capabilities")) value = contract.capabilities;
      else if (url.pathname.endsWith("/openapi.json")) value = openApi();
      else if (request.method !== "HEAD") value = semanticResult(calculateCurrentAlmanac(nowProvider()));
      return jsonResponse(request.method === "HEAD" ? null : value, 200);
    }
    if (request.method === "HEAD") return jsonResponse(null, 200);
    const instant = calculation ? await readCalculationInstant(request) : nowProvider();
    return jsonResponse(calculateCurrentAlmanac(instant), 200);
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 500;
    const extraHeaders = status === 429 || status === 503 ? { "retry-after": "1" } : {};
    return rejected(status, error instanceof ApiError ? error.message : "历法计算失败", extraHeaders);
  } finally {
    if (acquired) guard.release();
  }
}

export default {
  async fetch(request, env) {
    if (!env?.ALMANAC_RATE_LIMITER) {
      const path = new URL(request.url).pathname;
      return jsonResponse(request.method === "HEAD" ? null : path === "/mcp" ? rpcError(-32000, "服务暂不可用")
        : path.startsWith("/api/v2/") ? errorBody(503, "服务暂不可用") : { "错误": "服务暂不可用" }, 503, { "retry-after": "1" });
    }
    return handleRequest(request, () => new Date(), { rateLimiter: env.ALMANAC_RATE_LIMITER });
  },
};
