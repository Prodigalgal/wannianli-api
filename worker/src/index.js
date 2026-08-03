import { calculateCurrentAlmanac } from "./engine.js";

const API_PATH = "/api/v1/almanac/current";
const ALLOWED_PATHS = new Set(["/", API_PATH]);

function jsonResponse(value, status, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-wannianli-runtime", "cloudflare-worker-standalone");
  return new Response(value === null ? null : JSON.stringify(value), { status, headers });
}

export async function handleRequest(request, nowProvider = () => new Date()) {
  const url = new URL(request.url);
  if (!ALLOWED_PATHS.has(url.pathname)) {
    return jsonResponse({ "错误": "接口不存在" }, 404);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ "错误": "仅支持GET或HEAD请求" }, 405, { allow: "GET, HEAD" });
  }
  if (request.method === "HEAD") {
    return jsonResponse(null, 200);
  }

  try {
    return jsonResponse(calculateCurrentAlmanac(nowProvider()), 200);
  } catch {
    return jsonResponse({ "错误": "历法计算失败" }, 500);
  }
}

export default {
  async fetch(request) {
    return handleRequest(request);
  },
};
