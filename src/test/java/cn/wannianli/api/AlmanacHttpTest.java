package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashSet;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AlmanacHttpTest {

    @LocalServerPort
    private int port;

    @Test
    void servesOnlyTheCurrentAlmanacAsJson() throws Exception {
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
                .contains("\"宜忌\"")
                .contains("\"建除十二神\"")
                .contains("\"黄黑道十二值神\"")
                .contains("\"吉神\"")
                .contains("\"凶煞\"")
                .contains("\"是否闰月\":\"否\"")
                .contains("\"是否在期内\":\"是\"")
                .contains("\"有德神\":\"是\"")
                .contains("\"诸事皆忌\":\"否\"")
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
}
