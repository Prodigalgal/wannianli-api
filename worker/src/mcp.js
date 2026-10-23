import { ApiError, readBoundedBody } from "./request.js";
import { parseBoundedJson } from "./json.js";
import { contract, isObject, semanticInstant, semanticResult } from "./semantic.js";
import { calculateCurrentAlmanac } from "./engine.js";
import { rangeResult } from "./range.js";

export const MCP_MAX_BYTES = 16_384;
const MODERN = contract.protocolVersions[0];
const VERSION_KEY = "io.modelcontextprotocol/protocolVersion";
const CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities";
const SERVER_KEY = "io.modelcontextprotocol/serverInfo";
const capabilities = { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false } };

export function validOrigin(origin, url) {
  if (origin === null) return true;
  if (["https://wannianli.mnnu.eu.org", "https://wannianli-worker.mnnu.eu.org",
    "https://wannianli-worker.3101557049.workers.dev"].includes(origin)) return true;
  // Development only: allow the exact loopback origin, without trusting forwarded headers.
  return ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) && origin === url.origin;
}

function decodedName(value) {
  if (!value?.startsWith("=?base64?")) return value;
  if (!/^=\?base64\?[A-Za-z0-9+/]*={0,2}\?=$/u.test(value)) return null;
  try {
    const bytes = Uint8Array.from(atob(value.slice(9, -2)), c => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return null; }
}

export function rpcError(code, message, id = null, data) {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data === undefined ? {} : { data }) } };
}

export async function mcpRequest(request, nowProvider, charge) {
  let rpc;
  try { rpc = parseBoundedJson(await readBoundedBody(request, MCP_MAX_BYTES)); }
  catch (error) {
    if (!(error instanceof ApiError) || error.status !== 400) throw error;
    return { status: 400, body: rpcError(-32700, "Parse error") };
  }
  const validId = id => typeof id === "string" && id.length <= 128 || Number.isSafeInteger(id);
  if (!isObject(rpc) || rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string" || !rpc.method
      || rpc.method.length > 128 || Object.keys(rpc).some(k => !["jsonrpc", "id", "method", "params"].includes(k))
      || Object.hasOwn(rpc, "id") && !validId(rpc.id) || rpc.params !== undefined && !isObject(rpc.params)) {
    return { status: 400, body: rpcError(-32600, "Invalid Request") };
  }
  const id = rpc.id ?? null, params = rpc.params ?? {}, meta = params._meta ?? {};
  const headerVersion = request.headers.get("mcp-protocol-version");
  const modern = headerVersion === MODERN || meta[VERSION_KEY] === MODERN;
  const failure = (code, message, status = 200, data) => ({ status, body: rpcError(code, message, id, data) });
  if (headerVersion && !contract.protocolVersions.includes(headerVersion)) {
    return failure(-32022, "Unsupported protocol version", 400, { supported: contract.protocolVersions, requested: headerVersion });
  }
  if (modern) {
    const name = rpc.method === "tools/call" ? params.name : rpc.method === "resources/read" ? params.uri : null;
    if (!isObject(meta) || meta[VERSION_KEY] !== MODERN || !isObject(meta[CAPABILITIES_KEY])
        || headerVersion !== MODERN || request.headers.get("mcp-method") !== rpc.method
        || name !== null && (typeof name !== "string" || decodedName(request.headers.get("mcp-name")) !== name)) {
      return failure(-32020, "Required MCP headers and metadata must match the request", 400);
    }
  }
  if (!Object.hasOwn(rpc, "id")) return { status: 202, body: null };
  const result = (value, cache = false) => ({ status: 200, body: { jsonrpc: "2.0", id, result: modern
    ? { ...value, resultType: "complete", _meta: { [SERVER_KEY]: contract.serverInfo },
      ...(cache ? { ttlMs: 3_600_000, cacheScope: "public" } : {}) } : value } });
  if (rpc.method === "initialize" && !modern) {
    if (typeof params.protocolVersion !== "string" || !isObject(params.capabilities) || !isObject(params.clientInfo)
        || typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") return failure(-32602, "Invalid initialize parameters");
    return result({ protocolVersion: contract.protocolVersions.slice(1).includes(params.protocolVersion)
      ? params.protocolVersion : contract.protocolVersions[1], capabilities, serverInfo: contract.serverInfo, instructions: contract.instructions });
  }
  if (rpc.method === "server/discover" && modern) return result({ supportedVersions: contract.protocolVersions,
    capabilities, instructions: contract.instructions }, true);
  if (rpc.method === "ping") return result({});
  if (["tools/list", "resources/list", "resources/templates/list"].includes(rpc.method)) {
    if (params.cursor !== undefined) return failure(-32602, "Pagination cursor is not supported");
    return result(rpc.method === "tools/list" ? { tools: contract.tools }
      : rpc.method === "resources/list" ? { resources: contract.resources } : { resourceTemplates: [] }, true);
  }
  if (rpc.method === "resources/read") {
    if (params.uri !== contract.resources[0].uri) return failure(-32002, "Resource not found");
    return result({ contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(contract.capabilities) }] }, true);
  }
  if (rpc.method === "tools/call") {
    if (!contract.tools.some(tool => tool.name === params.name) || params.arguments !== undefined && !isObject(params.arguments)) {
      return failure(-32602, "Unknown tool or invalid arguments");
    }
    const args = params.arguments ?? {};
    if (!["calculate_almanac", "calculate_almanac_range"].includes(params.name) && Object.keys(args).length) return failure(-32602, "This tool does not accept arguments");
    try {
      const value = params.name === "calculate_almanac_range" ? await rangeResult(args, charge)
        : params.name === "get_calendar_capabilities" ? contract.capabilities
        : semanticResult(calculateCurrentAlmanac(params.name === "get_current_almanac" ? nowProvider() : semanticInstant(args)));
      const response = result({ content: [{ type: "text", text: JSON.stringify(value) }], structuredContent: value, isError: false });
      if (params.name === "calculate_almanac_range" && new TextEncoder().encode(JSON.stringify(response.body)).length > 786432)
        throw new ApiError(413, "MCP区间响应超过786432字节上限，请缩小区间");
      return response;
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      if (error.status !== 400) throw error;
      return result({ content: [{ type: "text", text: JSON.stringify({ error: { code: "INVALID_DATE", message: error.message } }) }], isError: true });
    }
  }
  return failure(-32601, "Method not found", modern ? 404 : 200);
}
