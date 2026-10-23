package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"almanac.security.requests-per-minute=10000", "almanac.security.burst=10000"})
class SemanticApiHttpTest {
    @LocalServerPort int port;
    @Autowired ApiContract contract;
    private final HttpClient http = HttpClient.newHttpClient();
    private final JsonMapper json = JsonMapper.builder().build();

    @Test
    void semanticQueriesAndJsonLunarLeapDatesAgree() throws Exception {
        var g = send("/api/v2/almanac?date=2020-05-23&time=23:59:59", null);
        var l = send("/api/v2/almanac", "{\"calendar\":\"lunar\",\"date\":\"2020-04-01\",\"time\":\"23:59:59\",\"leapMonth\":true}");
        assertThat(g.statusCode()).isEqualTo(200);
        assertThat(json.readTree(g.body())).isEqualTo(json.readTree(l.body()));
        var data = json.readTree(g.body());
        assertThat(data.path("lunar").path("leapMonth").asBoolean()).isTrue();
        assertThat(data.path("dateTime").asString()).contains("2020-05-23T23:59:59");
        assertThat(data.has("当前时间")).isFalse();
        assertThat(send("/api/v2/almanac/now", null).statusCode()).isEqualTo(200);
        assertThat(json.readTree(send("/api/v2/almanac/openapi.json", null).body()).path("openapi").asString()).isEqualTo("3.1.0");
    }

    @Test
    void rejectsAmbiguityAndReturnsMachineReadableErrors() throws Exception {
        for (String body : List.of("null", "[]", "{}", "{\"date\":\"2026-02-30\"}",
                "{\"date\":\"2026-08-03\",\"date\":\"2025-01-01\"}",
                "{\"date\":\"2026-08-03\",\"leapMonth\":\"false\"}", "{\"date\":\"2026-08-03\",\"time\":null}",
                "{\"date\":\"2026-08-03\",\"__proto__\":{}}")) {
            var response = send("/api/v2/almanac", body);
            assertThat(response.statusCode()).as(body).isEqualTo(400);
            assertThat(json.readTree(response.body()).path("error").path("code").asString()).isEqualTo("INVALID_REQUEST");
        }
        assertThat(send("/api/v2/almanac?date=2026-08-03&date=2026-08-03", null).statusCode()).isEqualTo(400);
        assertThat(send("/api/v2/almanac", " ".repeat(1025)).statusCode()).isEqualTo(413);
    }

    @Test
    void boundedRangePreservesLeapMonthAndRejectsInvalidOrExcessiveInput() throws Exception {
        var response = send("/api/v2/almanac/range?startDate=2020-05-22&endDate=2020-05-23&time=23:59:59", null);
        assertThat(response.statusCode()).isEqualTo(200);
        var result = json.readTree(response.body());
        assertThat(result.path("range").path("quotaUnits").asInt()).isEqualTo(2);
        assertThat(result.path("results").get(1).path("lunar").path("leapMonth").asBoolean()).isTrue();
        assertThat(result.path("results").get(1)).isEqualTo(json.readTree(send("/api/v2/almanac?date=2020-05-23&time=23:59:59", null).body()));
        for (String body : List.of("{}", "null", "{\"startDate\":\"2020-01-01\",\"endDate\":\"2020-01-15\"}",
                "{\"startDate\":\"2020-02-30\",\"endDate\":\"2020-03-01\"}",
                "{\"startDate\":\"2020-01-02\",\"endDate\":\"2020-01-01\"}",
                "{\"startDate\":\"2020-01-01\",\"endDate\":\"2020-01-02\",\"calendar\":\"lunar\"}"))
            assertThat(send("/api/v2/almanac/range", body).statusCode()).as(body).isEqualTo(400);
        var maximum = send("/api/v2/almanac/range", "{\"startDate\":\"2020-01-01\",\"endDate\":\"2020-01-14\"}");
        assertThat(maximum.statusCode()).isEqualTo(200);
        assertThat(maximum.body().getBytes(java.nio.charset.StandardCharsets.UTF_8).length).isLessThanOrEqualTo(262144);
        assertThat(json.readTree(maximum.body()).path("results").size()).isEqualTo(14);
    }

    @Test
    void allPublishedV1FieldsAndBooleansHaveExplicitContractMappings() throws Exception {
        var keys = new TreeSet<String>();
        var booleans = new TreeSet<String>();
        var names = (Map<?, ?>) contract.get("fieldNames");
        for (String date : List.of("{\"历法\":\"公历\",\"年\":2026,\"月\":8,\"日\":3}",
                "{\"历法\":\"公历\",\"年\":2026,\"月\":12,\"日\":25}")) {
            var response = send("/api/v1/almanac/calculate", date);
            assertThat(response.statusCode()).isEqualTo(200);
            collectFields(json.readValue(response.body(), Map.class), keys, booleans, names);
        }
        assertThat(keys).containsExactlyInAnyOrderElementsOf(names.keySet().stream().map(Object::toString).toList());
        assertThat(booleans).containsExactlyInAnyOrderElementsOf(((List<?>) contract.get("booleanKeys")).stream().map(Object::toString).toList());
    }

    @Test
    void gradeCodesAndDocumentedHeadResponsesMatchTheContract() throws Exception {
        var value = json.readTree(send("/api/v2/almanac?date=2026-08-03", null).body());
        var grades = (Map<?, ?>) ((Map<?, ?>) contract.get("capabilities")).get("dayGrades");
        assertThat(grades.get(value.path("activities").path("dayGradeCode").asString()))
                .isEqualTo(value.path("activities").path("dayGrade").asString());
        var paths = (Map<?, ?>) contract.openApi().get("paths");
        for (var path : paths.entrySet()) {
            var operations = (Map<?, ?>) path.getValue();
            assertThat(operations.containsKey("head")).isTrue();
            var get = (Map<?, ?>) operations.get("get");
            var head = (Map<?, ?>) operations.get("head");
            assertThat(head.get("parameters")).isEqualTo(get.get("parameters"));
            var responses = (Map<?, ?>) head.get("responses");
            assertThat(responses.keySet()).isEqualTo(((Map<?, ?>) get.get("responses")).keySet());
            for (var response : responses.values()) assertThat(((Map<?, ?>) response).containsKey("content")).isFalse();
            String target = path.getKey().toString() + (path.getKey().toString().endsWith("/range") ? "?startDate=2026-08-03&endDate=2026-08-04" : "/api/v2/almanac".equals(path.getKey()) ? "?date=2026-08-03" : "");
            var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + target))
                    .method("HEAD", HttpRequest.BodyPublishers.noBody()).build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.body()).isEmpty();
            assertThat(response.headers().firstValue("cache-control")).contains("no-store");
        }
    }

    private void collectFields(Object value, Set<String> keys, Set<String> booleans, Map<?, ?> names) {
        if (value instanceof List<?> list) list.forEach(child -> collectFields(child, keys, booleans, names));
        if (value instanceof Map<?, ?> map) map.forEach((key, child) -> {
            keys.add(key.toString());
            if ("是".equals(child) || "否".equals(child)) booleans.add(Objects.toString(names.get(key), "UNMAPPED:" + key));
            collectFields(child, keys, booleans, names);
        });
    }

    @Test
    void supportsLegacyHandshakeAndModernDiscoveryWhileProtectingRpc() throws Exception {
        var legacy = rpc("{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"initialize\",\"params\":{\"protocolVersion\":\"2025-11-25\",\"capabilities\":{},\"clientInfo\":{\"name\":\"test\",\"version\":\"1\"}}}", false, false);
        assertThat(json.readTree(legacy.body()).path("result").path("protocolVersion").asString()).isEqualTo("2025-11-25");
        String modern = "{\"jsonrpc\":\"2.0\",\"id\":\"discover\",\"method\":\"server/discover\",\"params\":{\"_meta\":{\"io.modelcontextprotocol/protocolVersion\":\"2026-07-28\",\"io.modelcontextprotocol/clientCapabilities\":{}}}}";
        var discover = rpc(modern, true, false);
        assertThat(discover.statusCode()).isEqualTo(200);
        assertThat(json.readTree(discover.body()).path("result").path("resultType").asString()).isEqualTo("complete");
        assertThat(json.readTree(rpc(modern, false, false).body()).path("error").path("code").asInt()).isEqualTo(-32020);
        assertThat(rpc(modern, true, true).statusCode()).isEqualTo(403);
        assertThat(json.readTree(rpc("{\"params\":{\"x\":1,\"x\":2}}", false, false).body()).path("error").path("code").asInt()).isEqualTo(-32700);
        assertThat(rpc(" ".repeat(16_385), false, false).statusCode()).isEqualTo(413);
    }

    private HttpResponse<String> send(String path, String body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path));
        if (body == null) request.GET();
        else request.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
    private HttpResponse<String> rpc(String body, boolean modern, boolean hostileOrigin) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/mcp"))
                .header("Content-Type", "application/json").header("Accept", "application/json, text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(body));
        if (modern) request.header("MCP-Protocol-Version", "2026-07-28").header("Mcp-Method", "server/discover");
        if (hostileOrigin) request.header("Origin", "https://attacker.invalid");
        return http.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
