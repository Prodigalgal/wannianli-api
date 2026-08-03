package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

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
                .contains("\"currentTime\"")
                .contains("\"fourPillars\"")
                .contains("\"activities\"")
                .contains("\"javaCalendarLibraryUsed\":false")
                .contains("XIEJI_BIANFANGSHU_VOLUME_10");
    }
}
