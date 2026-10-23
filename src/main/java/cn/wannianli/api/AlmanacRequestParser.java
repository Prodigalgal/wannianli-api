package cn.wannianli.api;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;

import org.springframework.http.HttpStatus;

import tools.jackson.core.JacksonException;
import tools.jackson.core.JsonToken;
import tools.jackson.core.ObjectReadContext;
import tools.jackson.core.StreamReadConstraints;
import tools.jackson.core.StreamReadFeature;
import tools.jackson.core.json.JsonFactory;

public final class AlmanacRequestParser {

    public static final int MAX_BODY_BYTES = 1024;
    private static final JsonFactory JSON = JsonFactory.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .streamReadConstraints(StreamReadConstraints.builder()
                    .maxDocumentLength(MAX_BODY_BYTES).maxNestingDepth(1)
                    .maxNameLength(32).maxStringLength(128).maxNumberLength(10).build())
            .build();

    private AlmanacRequestParser() {
    }

    public static AlmanacCalculationRequest parse(InputStream input) throws IOException {
        // Bound the raw stream as well: parser document-length checks alone are not an exact byte limit.
        long deadline = System.nanoTime() + 5_000_000_000L;
        var buffer = new ByteArrayOutputStream(MAX_BODY_BYTES + 1);
        byte[] chunk = new byte[256];
        try {
            while (buffer.size() <= MAX_BODY_BYTES) {
                if (System.nanoTime() > deadline) throw timeout();
                int count = input.read(chunk, 0, Math.min(chunk.length, MAX_BODY_BYTES + 1 - buffer.size()));
                if (System.nanoTime() > deadline) throw timeout();
                if (count < 0) break;
                buffer.write(chunk, 0, count);
            }
        } catch (IOException error) {
            // Servlet containers may wrap SocketTimeoutException in ClientAbortException.
            Throwable cause = error;
            for (int i = 0; cause != null && i < 8; i++, cause = cause.getCause()) {
                if (cause instanceof SocketTimeoutException) throw timeout();
            }
            throw new AlmanacApiException(HttpStatus.BAD_REQUEST, "请求体读取失败");
        }
        byte[] bytes = buffer.toByteArray();
        if (bytes.length > MAX_BODY_BYTES) {
            throw new AlmanacApiException(HttpStatus.PAYLOAD_TOO_LARGE, "请求体不能超过1024字节");
        }
        String text;
        try {
            text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException error) {
            throw invalidJson();
        }
        try (var parser = JSON.createParser(ObjectReadContext.empty(), text)) {
            if (parser.nextToken() != JsonToken.START_OBJECT) {
                throw invalidJson();
            }
            var fields = new HashMap<String, Object>();
            while (parser.nextToken() != JsonToken.END_OBJECT) {
                if (parser.currentToken() != JsonToken.PROPERTY_NAME || fields.size() >= 8) {
                    throw invalidJson();
                }
                String name = parser.currentName();
                Object value = switch (parser.nextToken()) {
                    case null -> throw invalidJson();
                    case VALUE_STRING -> parser.getString();
                    case VALUE_NUMBER_INT -> parser.getIntValue();
                    default -> throw invalidJson();
                };
                fields.put(name, value);
            }
            if (parser.nextToken() != null) {
                throw invalidJson();
            }
            return AlmanacCalculationRequest.from(fields);
        } catch (JacksonException error) {
            throw invalidJson();
        }
    }

    private static AlmanacApiException invalidJson() {
        return new AlmanacApiException(HttpStatus.BAD_REQUEST,
                "请求体必须是字段不重复、无嵌套且只含字符串或整数的UTF-8 JSON对象");
    }

    private static AlmanacApiException timeout() {
        return new AlmanacApiException(HttpStatus.REQUEST_TIMEOUT, "请求体读取超时");
    }
}
