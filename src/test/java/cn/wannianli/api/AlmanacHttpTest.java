package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "almanac.security.requests-per-minute=60000", "almanac.security.burst=2000"
})
class AlmanacHttpTest {

    private static final JsonMapper JSON = JsonMapper.builder().build();
    private static final Map<String, Object> SOLAR = Map.of(
            "历法", "公历", "年", 2026, "月", 8, "日", 3, "时", 12, "分", 34, "秒", 56);
    private final HttpClient http = HttpClient.newHttpClient();

    @LocalServerPort
    private int port;

    @Test
    void servesTheCurrentAlmanacAsJson() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(
                        "http://127.0.0.1:" + port + "/api/v1/almanac/current"))
                .header("Accept", "application/json")
                .GET()
                .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
                .send(request, HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("content-type").orElse(""))
                .startsWith("application/json");
        assertThat(response.body())
                .contains("\"当前时间\"")
                .contains("\"四柱\"")
                .contains("\"年柱\"")
                .contains("\"纳音\"")
                .contains("\"旬空\"")
                .contains("\"所属旬\"")
                .contains("\"空亡\"")
                .contains("\"宜忌\"")
                .contains("\"建除十二神\"")
                .contains("\"黄黑道十二值神\"")
                .contains("\"吉神\"")
                .contains("\"凶煞\"")
                .containsPattern("\\\"是否闰月\\\":\\\"(?:是|否)\\\"")
                .containsPattern("\\\"是否在期内\\\":\\\"(?:是|否)\\\"")
                .containsPattern("\\\"有德神\\\":\\\"(?:是|否)\\\"")
                .containsPattern("\\\"诸事皆忌\\\":\\\"(?:是|否)\\\"")
                .doesNotContain("\"currentTime\"")
                .doesNotContain("\"fourPillars\"")
                .doesNotContain("\"activities\"")
                .doesNotContain(":true", ":false")
                .doesNotContain("references")
                .doesNotContain("sourceId")
                .doesNotContain("evidenceLevel")
                .doesNotContain("calculationDisclosure")
                .doesNotContain("ruleHits")
                .doesNotContain("decisions")
                .doesNotContain("conflictPolicy")
                .doesNotContain("culturalUseNotice")
                .doesNotContain("不构成科学")
                .doesNotContain("法律或医学建议");

        var keys = new HashSet<String>();
        var matcher = Pattern.compile("\\\"([^\\\"]+)\\\"\\s*:").matcher(response.body());
        while (matcher.find()) {
            keys.add(matcher.group(1));
        }
        assertThat(keys).isNotEmpty().allSatisfy(key -> assertThat(key).doesNotContainPattern("[A-Za-z]"));
    }

    @Test
    void calculatesTheSameGregorianAndLunarDateTime() throws Exception {
        var gregorian = post(JSON.writeValueAsString(SOLAR));
        var lunar = post("""
                {"历法":"农历","年":2026,"月":6,"日":21,"时":12,"分":34,"秒":56}
                """);
        assertThat(gregorian.statusCode()).isEqualTo(200);
        assertThat(lunar.statusCode()).isEqualTo(200);
        assertThat(lunar.body()).isEqualTo(gregorian.body());
        assertThat(gregorian.body()).contains("2026-08-03T12:34:56+08:00", "二〇二六年六月廿一", "\"旬空\"");
        assertThat(gregorian.headers().firstValue("cache-control")).contains("no-store");
        assertThat(gregorian.headers().firstValue("x-content-type-options")).contains("nosniff");
    }

    @Test
    void distinguishesLeapMonthsAndDefaultsTheTimeToMidnight() throws Exception {
        var regular = post("{\"历法\":\"农历\",\"年\":2020,\"月\":4,\"日\":1}");
        var leap = post("{\"历法\":\"农历\",\"年\":2020,\"月\":4,\"日\":1,\"是否闰月\":\"是\"}");
        assertThat(regular.statusCode()).isEqualTo(200);
        assertThat(leap.statusCode()).isEqualTo(200);
        assertThat(regular.body()).contains("2020-04-23T00:00:00+08:00", "\"是否闰月\":\"否\"");
        assertThat(leap.body()).contains("2020-05-23T00:00:00+08:00", "\"是否闰月\":\"是\"");
    }

    @Test
    void rejectsInvalidDatesTypesUnknownFieldsAndMalformedOrAmbiguousJson() throws Exception {
        String valid = "{\"历法\":\"公历\",\"年\":2026,\"月\":8,\"日\":3}";
        List<String> bodies = List.of(
                "{}", "[]", "null", "\"text\"", "", "{", "{\"年\":", "{\"年\":2026,}",
                valid + "{}", valid.replace("2026", "2026.0"), valid.replace("2026", "2026e0"),
                valid.replace("2026", "02026"), valid.replace("2026", "999999999999999999999999"),
                valid.replace("2026", "\"2026\""), valid.replace("2026", "true"), valid.replace("2026", "null"),
                valid.replace("2026", "1800"), valid.replace("2026", "2200"), valid.replace("2026", "-1"),
                valid.replace("2026", "2147483648"), valid.replace("公历", "阳历"),
                valid.replace("\"月\":8", "\"月\":0"), valid.replace("\"月\":8", "\"月\":13"),
                valid.replace("\"日\":3", "\"日\":0"), valid.replace("\"日\":3", "\"日\":32"),
                valid.replace("\"月\":8,\"日\":3", "\"月\":2,\"日\":30"),
                "{\"历法\":\"公历\",\"年\":1900,\"月\":2,\"日\":29}",
                valid.replace("}", ",\"时\":24}"), valid.replace("}", ",\"时\":-1}"),
                valid.replace("}", ",\"时\":null}"), valid.replace("}", ",\"分\":60}"),
                valid.replace("}", ",\"秒\":60}"), valid.replace("}", ",\"是否闰月\":\"是\"}"),
                valid.replace("}", ",\"是否闰月\":true}"), valid.replace("}", ",\"时区\":\"UTC\"}"),
                "{\"年\":2020," + valid.substring(1), "{\"\\u5e74\":2020," + valid.substring(1),
                "{\"__proto__\":{\"polluted\":true}}", "{\"月\":[[[[1]]]]}",
                "{\"历法\":\"农历\",\"年\":2026,\"月\":2,\"日\":30}",
                "{\"历法\":\"农历\",\"年\":2026,\"月\":4,\"日\":1,\"是否闰月\":\"是\"}",
                "{\"历法\":\"农历\",\"年\":2199,\"月\":12,\"日\":1}",
                "{\"历法\":\"农历\",\"年\":1800,\"月\":1,\"日\":1}",
                valid.replace("公历", "<script>alert(1)</script>"),
                valid.replace("2026", "\"2026; DROP TABLE dates\""),
                valid.replace("2026", "\"${jndi:ldap://example.invalid/a}\""),
                "\uFEFF" + valid, valid.replace("{", "{/*comment*/"));
        for (String body : bodies) {
            var response = post(body);
            assertThat(response.statusCode()).as(body).isEqualTo(400);
            assertThat(response.body()).contains("\"错误\"").doesNotContain("Exception", "Stack", "DROP", "jndi", "<script>");
            assertThat(JSON.readTree(response.body()).size()).isEqualTo(1);
        }
    }

    @Test
    void rejectsLargeCompressedAndNonUtf8BodiesIncludingChunkedRequests() throws Exception {
        byte[] oversized = " ".repeat(1025).getBytes(StandardCharsets.UTF_8);
        for (var publisher : List.of(HttpRequest.BodyPublishers.ofByteArray(oversized),
                HttpRequest.BodyPublishers.ofInputStream(() -> new ByteArrayInputStream(oversized)))) {
            var response = http.send(HttpRequest.newBuilder(uri("/calculate"))
                    .header("Content-Type", "application/json").POST(publisher).build(), HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(413);
        }
        var malformed = http.send(HttpRequest.newBuilder(uri("/calculate"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofByteArray(new byte[]{(byte) 0xff, (byte) 0xfe, 123, 125})).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(malformed.statusCode()).isEqualTo(400);
        for (String contentType : List.of("text/plain", "application/json; charset=GBK", "application/x-www-form-urlencoded")) {
            var response = http.send(HttpRequest.newBuilder(uri("/calculate")).header("Content-Type", contentType)
                    .POST(HttpRequest.BodyPublishers.ofString("{}")).build(), HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(415);
        }
        var compressed = http.send(HttpRequest.newBuilder(uri("/calculate"))
                .header("Content-Type", "application/json").header("Content-Encoding", "gzip")
                .POST(HttpRequest.BodyPublishers.ofString("{}")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(compressed.statusCode()).isEqualTo(415);
    }

    @Test
    void rejectsUnsupportedMethodsQueriesAndScannerPathsWithoutExposingInternals() throws Exception {
        for (String method : List.of("GET", "HEAD", "PUT", "DELETE", "OPTIONS")) {
            var response = http.send(HttpRequest.newBuilder(uri("/calculate"))
                    .method(method, HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(405);
            assertThat(response.headers().firstValue("allow")).contains("POST");
            assertThat(response.headers().firstValue("access-control-allow-origin")).isEmpty();
        }
        var query = http.send(HttpRequest.newBuilder(uri("/calculate?year=2026"))
                .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString("{}")).build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(query.statusCode()).isEqualTo(400);
        var missing = http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/.env")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(missing.statusCode()).isEqualTo(404);
        assertThat(missing.body()).isEqualTo("{\"错误\":\"接口不存在\"}");
        assertThat(missing.headers().firstValue("x-frame-options")).contains("DENY");
    }

    private URI uri(String suffix) {
        return URI.create("http://127.0.0.1:" + port + "/api/v1/almanac" + suffix);
    }

    private HttpResponse<String> post(String body) throws Exception {
        return http.send(HttpRequest.newBuilder(uri("/calculate")).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
    }
}
