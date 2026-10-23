package cn.wannianli.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;
import java.util.Collections;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import cn.wannianli.api.AlmanacRequestParser;
import cn.wannianli.api.ApiContract;
import cn.wannianli.api.ApiErrors;
import cn.wannianli.api.McpController;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiSecurityFilter extends OncePerRequestFilter {

    private final ApiRequestGuard guard;
    private final ApiContract contract;

    public ApiSecurityFilter(@Value("${almanac.security.requests-per-minute:120}") int perMinute,
                             @Value("${almanac.security.burst:20}") int burst,
                             @Value("${almanac.security.max-concurrent:4}") int maxConcurrent, ApiContract contract) {
        this.guard = new ApiRequestGuard(perMinute, burst, maxConcurrent);
        this.contract = contract;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
        response.setHeader("Referrer-Policy", "no-referrer");

        String path = request.getRequestURI();
        boolean calculation = "/api/v1/almanac/calculate".equals(path);
        boolean mcp = "/mcp".equals(path);
        boolean range = path.equals("/api/v2/almanac/range");
        boolean v2 = Set.of("/api/v2/almanac", "/api/v2/almanac/range", "/api/v2/almanac/now", "/api/v2/almanac/capabilities",
                "/api/v2/almanac/openapi.json").contains(path);
        if (!calculation && !"/api/v1/almanac/current".equals(path) && !v2 && !mcp) {
            reject(request, response, 404, "接口不存在");
            return;
        }
        String method = request.getMethod();
        if (mcp && !validOrigin(request)) {
            reject(request, response, 403, "Origin不在允许范围");
            return;
        }
        Set<String> methods = calculation || mcp ? Set.of("POST") : path.equals("/api/v2/almanac") || range
                ? Set.of("GET", "HEAD", "POST") : Set.of("GET", "HEAD");
        if (!methods.contains(method)) {
            response.setHeader("Allow", calculation || mcp ? "POST" : path.equals("/api/v2/almanac") || range ? "GET, HEAD, POST" : "GET, HEAD");
            reject(request, response, 405, "请求方法不支持");
            return;
        }
        if (request.getQueryString() != null && !request.getQueryString().isEmpty()
                && !((path.equals("/api/v2/almanac") || range) && !"POST".equals(method))) {
            reject(request, response, 400, "接口不接受查询参数");
            return;
        }
        if ("POST".equals(method) && !validJsonContentType(request.getContentType())) {
            reject(request, response, 415, "Content-Type必须为application/json且使用UTF-8编码");
            return;
        }
        String encoding = request.getHeader("Content-Encoding");
        if (encoding != null && !"identity".equalsIgnoreCase(encoding)) {
            reject(request, response, 415, "不支持压缩请求体");
            return;
        }
        int maximum = mcp ? McpController.MAX_BYTES : AlmanacRequestParser.MAX_BODY_BYTES;
        if (request.getContentLengthLong() > maximum) {
            reject(request, response, 413, "请求体不能超过" + maximum + "字节");
            return;
        }
        if (!"POST".equals(method) && (request.getContentLengthLong() > 0
                || request.getHeader("Transfer-Encoding") != null)) {
            reject(request, response, 400, "当前时间接口不接受请求体");
            return;
        }
        if (mcp) {
            String accept = String.join(",", Collections.list(request.getHeaders("Accept")));
            if (!accepts(accept, "application/json") || !accepts(accept, "text/event-stream")) {
                reject(request, response, 406, "Accept必须同时包含application/json和text/event-stream");
                return;
            }
        }
        var decision = guard.acquire();
        if (decision != ApiRequestGuard.Decision.ALLOWED) {
            response.setHeader("Retry-After", "1");
            reject(request, response, decision == ApiRequestGuard.Decision.RATE_LIMITED ? 429 : 503,
                    decision == ApiRequestGuard.Decision.RATE_LIMITED ? "请求过于频繁，请稍后重试" : "计算繁忙，请稍后重试");
            return;
        }
        try {
            request.setAttribute(cn.wannianli.api.RangeCalculator.GUARD_ATTRIBUTE, guard);
            chain.doFilter(request, response);
        } finally {
            guard.release();
        }
    }

    private boolean validJsonContentType(String contentType) {
        return contentType != null && contentType.matches(
                "(?i)^application/json(?:\\s*;\\s*charset\\s*=\\s*(?:utf-8|\"utf-8\"))?\\s*$");
    }

    private boolean accepts(String accept, String media) {
        return accept != null && Arrays.stream(accept.split(",")).anyMatch(part -> {
            String[] tokens = part.trim().split(";");
            return tokens[0].trim().equalsIgnoreCase(media) && Arrays.stream(tokens).skip(1)
                    .noneMatch(p -> p.matches("\\s*q\\s*=\\s*0(?:\\.0*)?\\s*"));
        });
    }

    private boolean validOrigin(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin == null) return true;
        if (Collections.list(request.getHeaders("Origin")).size() != 1) return false;
        if (Set.of("https://wannianli.mnnu.eu.org", "https://wannianli-worker.mnnu.eu.org",
                "https://wannianli-worker.3101557049.workers.dev").contains(origin)) return true;
        String host = request.getServerName();
        int port = request.getServerPort();
        String local = request.getScheme() + "://" + host + ((port == 80 || port == 443) ? "" : ":" + port);
        return Set.of("127.0.0.1", "localhost", "[::1]").contains(host) && origin.equals(local);
    }

    private void reject(HttpServletRequest request, HttpServletResponse response, int status, String message)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json; charset=UTF-8");
        if (!"HEAD".equals(request.getMethod())) {
            if (request.getRequestURI().equals("/mcp")) {
                Object body = McpController.failure(status, -32000, message, null, null).getBody();
                if ("2026-07-28".equals(request.getHeader("MCP-Protocol-Version")) && body instanceof java.util.Map<?, ?> map) map.remove("id");
                response.getWriter().write(contract.encode(body));
            } else if (request.getRequestURI().startsWith("/api/v2/")) {
                response.getWriter().write(contract.encode(ApiErrors.body(status, message)));
            } else response.getWriter().write("{\"错误\":\"" + message + "\"}");
        }
    }
}
