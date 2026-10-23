package cn.wannianli.api;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Set;

import org.springframework.http.HttpStatus;
import tools.jackson.core.*;
import tools.jackson.core.json.JsonFactory;

/** A separate bounded nested grammar for v2 and JSON-RPC; v1 remains flat and unchanged. */
public final class BoundedJson {
    private static final JsonFactory JSON = JsonFactory.builder()
            .enable(StreamReadFeature.STRICT_DUPLICATE_DETECTION)
            .streamReadConstraints(StreamReadConstraints.builder().maxDocumentLength(16_384)
                    .maxNestingDepth(13).maxNameLength(128).maxStringLength(4096).maxNumberLength(24).build()).build();
    private static final Set<String> UNSAFE_NAMES = Set.of("__proto__", "prototype", "constructor");

    private BoundedJson() { }

    public static Object read(InputStream input, int maximum) throws IOException {
        long deadline = System.nanoTime() + 5_000_000_000L;
        var buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[256];
        try {
            while (buffer.size() <= maximum) {
                if (System.nanoTime() > deadline) throw timedOut();
                int count = input.read(chunk, 0, Math.min(chunk.length, maximum + 1 - buffer.size()));
                if (System.nanoTime() > deadline) throw timedOut();
                if (count < 0) break;
                buffer.write(chunk, 0, count);
            }
        } catch (IOException error) {
            Throwable cause = error;
            for (int i = 0; cause != null && i < 8; i++, cause = cause.getCause()) {
                if (cause instanceof SocketTimeoutException) throw timedOut();
            }
            throw invalid();
        }
        if (buffer.size() > maximum) throw new AlmanacApiException(HttpStatus.PAYLOAD_TOO_LARGE,
                "请求体不能超过" + maximum + "字节");
        String text;
        try {
            text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(buffer.toByteArray())).toString();
        } catch (java.nio.charset.CharacterCodingException error) { throw invalid(); }
        try (var parser = JSON.createParser(ObjectReadContext.empty(), text)) {
            parser.nextToken();
            Object value = value(parser, 0, new int[2]);
            if (parser.nextToken() != null) throw invalid();
            return value;
        } catch (JacksonException error) { throw invalid(); }
    }

    private static Object value(JsonParser parser, int depth, int[] counts) {
        if (depth > 12 || ++counts[0] > 1024 || parser.currentToken() == null) throw invalid();
        return switch (parser.currentToken()) {
            case START_OBJECT -> {
                var result = new LinkedHashMap<String, Object>();
                while (parser.nextToken() != JsonToken.END_OBJECT) {
                    if (parser.currentToken() != JsonToken.PROPERTY_NAME || ++counts[1] > 256) throw invalid();
                    String name = parser.currentName();
                    if (UNSAFE_NAMES.contains(name)) throw invalid();
                    parser.nextToken();
                    result.put(name, value(parser, depth + 1, counts));
                }
                yield result;
            }
            case START_ARRAY -> {
                var result = new ArrayList<>();
                while (parser.nextToken() != JsonToken.END_ARRAY) result.add(value(parser, depth + 1, counts));
                yield result;
            }
            case VALUE_STRING -> {
                String text = parser.getString();
                for (int i = 0; i < text.length(); i++) {
                    char ch = text.charAt(i);
                    if (Character.isHighSurrogate(ch)) {
                        if (++i >= text.length() || !Character.isLowSurrogate(text.charAt(i))) throw invalid();
                    } else if (Character.isLowSurrogate(ch)) throw invalid();
                }
                yield text;
            }
            case VALUE_NUMBER_INT, VALUE_NUMBER_FLOAT -> {
                double number = parser.getDoubleValue();
                if (!Double.isFinite(number)) throw invalid();
                yield number;
            }
            case VALUE_TRUE -> true;
            case VALUE_FALSE -> false;
            case VALUE_NULL -> null;
            default -> throw invalid();
        };
    }

    private static AlmanacApiException invalid() {
        return new AlmanacApiException(HttpStatus.BAD_REQUEST, "JSON无效、字段重复或结构超出限制");
    }
    private static AlmanacApiException timedOut() {
        return new AlmanacApiException(HttpStatus.REQUEST_TIMEOUT, "请求体读取超时");
    }
}
