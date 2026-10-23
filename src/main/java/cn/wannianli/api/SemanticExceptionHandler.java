package cn.wannianli.api;

import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice(assignableTypes = SemanticAlmanacController.class)
public class SemanticExceptionHandler {
    @ExceptionHandler(AlmanacApiException.class)
    ResponseEntity<Object> rejected(AlmanacApiException error) {
        var response = ResponseEntity.status(error.status());
        if (error.status().value() == 429 || error.status().value() == 503) response.header("Retry-After", "1");
        return response.body(ApiErrors.body(error.status().value(), error.getMessage()));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Object> invalid(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(ApiErrors.body(400, error.getMessage()));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<Object> failed(Exception error) {
        LoggerFactory.getLogger(getClass()).error("Almanac v2 failed", error);
        return ResponseEntity.internalServerError().body(ApiErrors.body(500, "历法计算失败"));
    }
}
