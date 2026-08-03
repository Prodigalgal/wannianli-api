const API_PATH = "/api/v1/almanac/current";
const ALLOWED_PATHS = new Set(["/", API_PATH]);

function jsonResponse(value, status, extraHeaders = {}) {
  const headers = new Headers(extraHeaders);
  headers.set("content-type", "application/json; charset=UTF-8");
  headers.set("cache-control", "no-store");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-wannianli-runtime", "cloudflare-worker");
  return new Response(JSON.stringify(value), { status, headers });
}

export function localizeBooleans(value) {
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  if (Array.isArray(value)) {
    return value.map(localizeBooleans);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, localizeBooleans(child)]),
    );
  }
  return value;
}

export async function handleRequest(request, env, fetchImpl = fetch) {
  const url = new URL(request.url);
  if (!ALLOWED_PATHS.has(url.pathname)) {
    return jsonResponse({ "错误": "接口不存在" }, 404);
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return jsonResponse({ "错误": "仅支持GET或HEAD请求" }, 405, { allow: "GET, HEAD" });
  }
  if (!env.ORIGIN_URL) {
    return jsonResponse({ "错误": "源站未配置" }, 503);
  }

  let upstream;
  try {
    upstream = await fetchImpl(new Request(env.ORIGIN_URL, {
      method: request.method,
      headers: { accept: "application/json" },
      redirect: "manual",
      cf: { cacheEverything: false, cacheTtl: 0 },
    }));
  } catch {
    return jsonResponse({ "错误": "源站暂时不可用" }, 502);
  }

  if (!upstream.ok || !upstream.headers.get("content-type")?.includes("application/json")) {
    return jsonResponse({ "错误": "源站返回异常" }, 502);
  }
  if (request.method === "HEAD") {
    const response = jsonResponse(null, 200);
    return new Response(null, { status: response.status, headers: response.headers });
  }

  try {
    return jsonResponse(localizeBooleans(await upstream.json()), 200);
  } catch {
    return jsonResponse({ "错误": "源站结果无法解析" }, 502);
  }
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
