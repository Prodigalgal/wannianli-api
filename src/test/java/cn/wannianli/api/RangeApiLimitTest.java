package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"almanac.security.requests-per-minute=1", "almanac.security.burst=20"})
class RangeApiLimitTest {
    @LocalServerPort int port;
    @Test
    void mcpCannotBypassTheSharedPerDayQuota() throws Exception {
        var http = HttpClient.newHttpClient();
        var response = http.send(HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port +
                "/api/v2/almanac/range?startDate=2020-01-01&endDate=2020-01-14")).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        String body = "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"calculate_almanac_range\",\"arguments\":{\"startDate\":\"2020-01-01\",\"endDate\":\"2020-01-07\"}}}";
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/mcp"))
                .header("Content-Type", "application/json").header("Accept", "application/json, text/event-stream")
                .header("MCP-Protocol-Version", "2025-11-25").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var limited = http.send(request, HttpResponse.BodyHandlers.ofString());
        assertThat(limited.statusCode()).isEqualTo(429);
        assertThat(limited.headers().firstValue("retry-after")).contains("1");
    }
}
