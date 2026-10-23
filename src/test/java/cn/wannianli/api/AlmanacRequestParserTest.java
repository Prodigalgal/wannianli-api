package cn.wannianli.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.io.InputStream;
import java.net.SocketTimeoutException;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AlmanacRequestParserTest {
    @Test
    void classifiesDirectAndServletWrappedReadTimeoutsWithoutTreatingThemAsCalculationFailures() {
        for (IOException error : List.of(new SocketTimeoutException(), new IOException(new SocketTimeoutException()))) {
            assertThatThrownBy(() -> AlmanacRequestParser.parse(failingStream(error)))
                    .isInstanceOfSatisfying(AlmanacApiException.class, result -> {
                        assertThat(result.status()).isEqualTo(HttpStatus.REQUEST_TIMEOUT);
                        assertThat(result.getMessage()).isEqualTo("请求体读取超时");
                    });
        }
    }

    @Test
    void doesNotExposeClientConnectionFailureDetails() {
        assertThatThrownBy(() -> AlmanacRequestParser.parse(failingStream(new IOException("internal connection details"))))
                .isInstanceOfSatisfying(AlmanacApiException.class, result -> {
                    assertThat(result.status()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(result.getMessage()).isEqualTo("请求体读取失败");
                });
    }

    private InputStream failingStream(IOException error) {
        return new InputStream() {
            @Override
            public int read() throws IOException { throw error; }
        };
    }
}
