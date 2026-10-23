package cn.wannianli.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AlmanacController.class)
public class AlmanacExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(AlmanacExceptionHandler.class);

    @ExceptionHandler(AlmanacApiException.class)
    ResponseEntity<ErrorResponse> rejectedRequest(AlmanacApiException error) {
        return ResponseEntity.status(error.status()).body(new ErrorResponse(error.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorResponse> invalidInput(IllegalArgumentException error) {
        return ResponseEntity.badRequest().body(new ErrorResponse(error.getMessage()));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ErrorResponse> invalidJson() {
        return ResponseEntity.badRequest().body(new ErrorResponse("请求体必须是有效的JSON对象"));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ErrorResponse> unsupportedContentType() {
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE)
                .body(new ErrorResponse("Content-Type必须为application/json"));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> calculationFailed(Exception error) {
        LOGGER.error("Almanac calculation failed", error);
        return ResponseEntity.internalServerError().body(new ErrorResponse("历法计算失败"));
    }

    public record ErrorResponse(@JsonProperty("错误") String message) {
    }
}
