package cn.wannianli.api;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

public final class SemanticRequest {
    private static final Set<String> FIELDS = Set.of("calendar", "date", "time", "leapMonth");
    private SemanticRequest() { }

    public static AlmanacCalculationRequest from(Object input) {
        if (!(input instanceof Map<?, ?> fields) || fields.keySet().stream().anyMatch(k -> !FIELDS.contains(k))) {
            throw new IllegalArgumentException("仅接受calendar、date、time和leapMonth参数");
        }
        Object calendar = fields.containsKey("calendar") ? fields.get("calendar") : "gregorian";
        Object date = fields.get("date");
        Object time = fields.containsKey("time") ? fields.get("time") : "00:00:00";
        Object leap = fields.containsKey("leapMonth") ? fields.get("leapMonth") : false;
        if (!"gregorian".equals(calendar) && !"lunar".equals(calendar)) throw new IllegalArgumentException("calendar必须为gregorian或lunar");
        if (!(date instanceof String day) || !day.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}")) throw new IllegalArgumentException("date必须为YYYY-MM-DD");
        if (!(time instanceof String clock) || !clock.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?")) {
            throw new IllegalArgumentException("time必须为HH:mm或HH:mm:ss，不接受时区偏移或闰秒");
        }
        if (!(leap instanceof Boolean leapMonth)) throw new IllegalArgumentException("leapMonth必须为布尔值");
        String[] parts = day.split("-");
        String[] times = clock.split(":");
        return new AlmanacCalculationRequest("lunar".equals(calendar) ? "农历" : "公历",
                Integer.parseInt(parts[0]), Integer.parseInt(parts[1]), Integer.parseInt(parts[2]),
                Integer.parseInt(times[0]), Integer.parseInt(times[1]), times.length == 3 ? Integer.parseInt(times[2]) : 0, leapMonth);
    }

    public static Map<String, Object> query(String query) {
        var result = new LinkedHashMap<String, Object>();
        if (query == null) return result;
        if (query.length() > 1024) throw new IllegalArgumentException("查询参数编码或长度无效");
        for (String part : query.split("&")) {
            if (part.isEmpty()) continue;
            String[] pair = part.split("=", 2);
            String name, value;
            try {
                name = URLDecoder.decode(pair[0], StandardCharsets.UTF_8);
                value = URLDecoder.decode(pair.length == 2 ? pair[1] : "", StandardCharsets.UTF_8);
            } catch (IllegalArgumentException error) { throw new IllegalArgumentException("查询参数编码或长度无效"); }
            if (result.containsKey(name)) throw new IllegalArgumentException("查询参数不能重复");
            if ("leapMonth".equals(name) && !"true".equals(value) && !"false".equals(value)) throw new IllegalArgumentException("leapMonth必须为true或false");
            result.put(name, "leapMonth".equals(name) ? Boolean.valueOf(value) : value);
        }
        return result;
    }
}
