package cn.wannianli.api;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import cn.wannianli.service.AlmanacService;

/** Stateless Streamable HTTP with discovery and legacy initialization compatibility. */
@RestController
public class McpController {
    public static final int MAX_BYTES = 16_384;
    private static final String MODERN = "2026-07-28";
    private static final String VERSION = "io.modelcontextprotocol/protocolVersion";
    private static final String CLIENT_CAPABILITIES = "io.modelcontextprotocol/clientCapabilities";
    private static final String SERVER_INFO = "io.modelcontextprotocol/serverInfo";
    private static final Map<String, Object> CAPABILITIES = Map.of("tools", Map.of("listChanged", false),
            "resources", Map.of("subscribe", false, "listChanged", false));
    private final AlmanacService service;
    private final ApiContract contract;
    private final RangeCalculator ranges;

    public McpController(AlmanacService service, ApiContract contract, RangeCalculator ranges) {
        this.service = service;
        this.contract = contract;
        this.ranges = ranges;
    }

    @PostMapping(value = "/mcp", consumes = "application/json")
    public ResponseEntity<Object> handle(HttpServletRequest request) {
        try {
            Object value;
            try { value = BoundedJson.read(request.getInputStream(), MAX_BYTES); }
            catch (AlmanacApiException error) {
                return omitUnknownModernId(failure(error.status().value(), error.status().value() == 400 ? -32700 : -32000,
                        error.status().value() == 400 ? "Parse error" : error.getMessage(), null, null), request);
            }
            var response = dispatch(value, request);
            return omitUnknownModernId(response, request);
        } catch (AlmanacApiException error) {
            var response = failure(error.status().value(), -32000, error.getMessage(), null, null);
            return ResponseEntity.status(error.status()).headers(headers -> {
                if (error.status().value() == 429 || error.status().value() == 503) headers.set("Retry-After", "1");
            }).body(omitUnknownModernId(response, request).getBody());
        } catch (Exception error) {
            LoggerFactory.getLogger(getClass()).error("MCP request failed", error);
            return omitUnknownModernId(failure(500, -32603, "Internal error", null, null), request);
        }
    }

    private ResponseEntity<Object> omitUnknownModernId(ResponseEntity<Object> response, HttpServletRequest request) {
        if (MODERN.equals(request.getHeader("MCP-Protocol-Version")) && response.getBody() instanceof Map<?, ?> map
                && map.containsKey("error") && map.get("id") == null) map.remove("id");
        return response;
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<Object> dispatch(Object value, HttpServletRequest request) {
        if (!(value instanceof Map<?, ?> raw) || !"2.0".equals(raw.get("jsonrpc"))
                || !(raw.get("method") instanceof String method) || method.isEmpty() || method.length() > 128
                || raw.keySet().stream().anyMatch(k -> !Set.of("jsonrpc", "id", "method", "params").contains(k))
                || raw.containsKey("id") && !validId(raw.get("id"))
                || raw.containsKey("params") && !(raw.get("params") instanceof Map<?, ?>)) {
            return failure(400, -32600, "Invalid Request", null, null);
        }
        Map<String, Object> rpc = (Map<String, Object>) raw;
        Object id = rpc.get("id");
        var params = object(rpc.get("params"));
        var meta = object(params.get("_meta"));
        String headerVersion = request.getHeader("MCP-Protocol-Version");
        boolean modern = MODERN.equals(headerVersion) || MODERN.equals(meta.get(VERSION));
        var versions = (List<String>) contract.get("protocolVersions");
        for (String header : List.of("MCP-Protocol-Version", "Mcp-Method", "Mcp-Name")) {
            if (Collections.list(request.getHeaders(header)).size() > 1) return failure(400, -32020,
                    "MCP metadata headers must not be repeated", id, null);
        }
        if (headerVersion != null && !versions.contains(headerVersion)) return failure(400, -32022,
                "Unsupported protocol version", id, Map.of("supported", versions, "requested", headerVersion));
        if (modern) {
            Object name = method.equals("tools/call") ? params.get("name") : method.equals("resources/read") ? params.get("uri") : null;
            boolean named = method.equals("tools/call") || method.equals("resources/read");
            if (!MODERN.equals(headerVersion) || !MODERN.equals(meta.get(VERSION))
                    || !(meta.get(CLIENT_CAPABILITIES) instanceof Map<?, ?>)
                    || !method.equals(request.getHeader("Mcp-Method"))
                    || named && (!(name instanceof String) || !name.equals(decodedName(request.getHeader("Mcp-Name"))))) {
                return failure(400, -32020, "Required MCP headers and metadata must match the request", id, null);
            }
        }
        if (!rpc.containsKey("id")) return ResponseEntity.accepted().build();
        if (method.equals("initialize") && !modern) {
            var client = object(params.get("clientInfo"));
            if (!(params.get("protocolVersion") instanceof String version) || !(params.get("capabilities") instanceof Map<?, ?>)
                    || !(client.get("name") instanceof String) || !(client.get("version") instanceof String)) {
                return failure(200, -32602, "Invalid initialize parameters", id, null);
            }
            return result(id, Map.of("protocolVersion", versions.subList(1, versions.size()).contains(version) ? version : versions.get(1),
                    "capabilities", CAPABILITIES, "serverInfo", contract.get("serverInfo"), "instructions", contract.get("instructions")), false, false);
        }
        if (method.equals("server/discover") && modern) return result(id, Map.of("supportedVersions", versions,
                "capabilities", CAPABILITIES, "instructions", contract.get("instructions")), true, true);
        if (method.equals("ping")) return result(id, Map.of(), modern, false);
        if (Set.of("tools/list", "resources/list", "resources/templates/list").contains(method)) {
            if (params.containsKey("cursor")) return failure(200, -32602, "Pagination cursor is not supported", id, null);
            String key = method.equals("tools/list") ? "tools" : method.equals("resources/list") ? "resources" : "resourceTemplates";
            return result(id, Map.of(key, key.equals("resourceTemplates") ? List.of() : contract.get(key)), modern, true);
        }
        if (method.equals("resources/read")) {
            if (!"almanac://capabilities".equals(params.get("uri"))) return failure(200, -32002, "Resource not found", id, null);
            return result(id, Map.of("contents", List.of(Map.of("uri", params.get("uri"), "mimeType", "application/json",
                    "text", contract.encode(contract.get("capabilities"))))), modern, true);
        }
        if (method.equals("tools/call")) {
            var tools = (List<Map<String, Object>>) contract.get("tools");
            if (tools.stream().noneMatch(tool -> tool.get("name").equals(params.get("name")))
                    || params.containsKey("arguments") && !(params.get("arguments") instanceof Map<?, ?>)) {
                return failure(200, -32602, "Unknown tool or invalid arguments", id, null);
            }
            var args = object(params.get("arguments"));
            String name = (String) params.get("name");
            if (!Set.of("calculate_almanac", "calculate_almanac_range").contains(name) && !args.isEmpty()) return failure(200, -32602, "This tool does not accept arguments", id, null);
            try {
                Object calculated = switch (name) {
                    case "get_calendar_capabilities" -> contract.get("capabilities");
                    case "get_current_almanac" -> contract.result(service.current());
                    case "calculate_almanac_range" -> ranges.calculate(args, request, false);
                    default -> contract.result(service.calculate(SemanticRequest.from(args)));
                };
                var response = result(id, Map.of("content", List.of(Map.of("type", "text", "text", contract.encode(calculated))),
                        "structuredContent", calculated, "isError", false), modern, false);
                if (name.equals("calculate_almanac_range") && contract.encode(response.getBody()).getBytes(StandardCharsets.UTF_8).length > 786432)
                    throw new AlmanacApiException(org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE, "MCP区间响应超过786432字节上限，请缩小区间");
                return response;
            } catch (IllegalArgumentException error) {
                Object body = Map.of("error", Map.of("code", "INVALID_DATE", "message", error.getMessage()));
                return result(id, Map.of("content", List.of(Map.of("type", "text", "text", contract.encode(body))), "isError", true), modern, false);
            }
        }
        return failure(modern ? 404 : 200, -32601, "Method not found", id, null);
    }

    private ResponseEntity<Object> result(Object id, Map<String, Object> value, boolean modern, boolean cache) {
        var result = new LinkedHashMap<>(value);
        if (modern) {
            result.put("resultType", "complete");
            result.put("_meta", Map.of(SERVER_INFO, contract.get("serverInfo")));
            if (cache) { result.put("ttlMs", 3_600_000); result.put("cacheScope", "public"); }
        }
        return ResponseEntity.ok(Map.of("jsonrpc", "2.0", "id", id, "result", result));
    }

    public static ResponseEntity<Object> failure(int status, int code, String message, Object id, Object data) {
        var body = new LinkedHashMap<String, Object>();
        body.put("jsonrpc", "2.0"); body.put("id", id);
        var error = new LinkedHashMap<String, Object>();
        error.put("code", code); error.put("message", message);
        if (data != null) error.put("data", data);
        body.put("error", error);
        return ResponseEntity.status(status).body(body);
    }

    private boolean validId(Object id) {
        return id instanceof String text && text.length() <= 128 || id instanceof Number number
                && Double.isFinite(number.doubleValue()) && Math.abs(number.doubleValue()) <= 9_007_199_254_740_991d
                && number.doubleValue() == Math.rint(number.doubleValue());
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> object(Object value) { return value instanceof Map<?, ?> map ? (Map<String, Object>) map : Map.of(); }

    private String decodedName(String value) {
        if (value == null || !value.startsWith("=?base64?")) return value;
        if (!value.matches("=\\?base64\\?[A-Za-z0-9+/]*={0,2}\\?=")) return null;
        try {
            byte[] bytes = Base64.getDecoder().decode(value.substring(9, value.length() - 2));
            return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
        } catch (Exception error) { return null; }
    }
}
