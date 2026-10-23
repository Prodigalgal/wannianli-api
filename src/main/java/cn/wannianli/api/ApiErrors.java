package cn.wannianli.api;

import java.util.Map;

public final class ApiErrors {
    private ApiErrors() { }

    public static Map<String, Object> body(int status, String message) {
        String code = switch (status) {
            case 400 -> "INVALID_REQUEST";
            case 403 -> "FORBIDDEN_ORIGIN";
            case 404 -> "NOT_FOUND";
            case 405 -> "METHOD_NOT_ALLOWED";
            case 406 -> "NOT_ACCEPTABLE";
            case 408 -> "REQUEST_TIMEOUT";
            case 413 -> "PAYLOAD_TOO_LARGE";
            case 415 -> "UNSUPPORTED_MEDIA_TYPE";
            case 429 -> "RATE_LIMITED";
            case 431 -> "HEADERS_TOO_LARGE";
            case 503 -> "SERVICE_UNAVAILABLE";
            default -> "INTERNAL_ERROR";
        };
        return Map.of("error", Map.of("code", code, "message", message));
    }
}
