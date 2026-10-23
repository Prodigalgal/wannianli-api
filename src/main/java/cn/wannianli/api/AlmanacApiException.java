package cn.wannianli.api;

import org.springframework.http.HttpStatus;

public final class AlmanacApiException extends RuntimeException {

    private final HttpStatus status;

    public AlmanacApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus status() {
        return status;
    }
}
