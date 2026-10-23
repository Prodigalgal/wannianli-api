package cn.wannianli.api;

import java.util.Map;
import java.util.Set;

public record AlmanacCalculationRequest(
        String calendar, int year, int month, int day,
        int hour, int minute, int second, boolean leapMonth) {

    private static final Set<String> FIELDS = Set.of("历法", "年", "月", "日", "时", "分", "秒", "是否闰月");

    public AlmanacCalculationRequest {
        if (!"公历".equals(calendar) && !"农历".equals(calendar)) {
            throw new IllegalArgumentException("历法必须为公历或农历");
        }
        requireRange("年", year, "农历".equals(calendar) ? 1800 : 1801, 2199);
        requireRange("月", month, 1, 12);
        requireRange("日", day, 1, "农历".equals(calendar) ? 30 : 31);
        requireRange("时", hour, 0, 23);
        requireRange("分", minute, 0, 59);
        requireRange("秒", second, 0, 59);
        if ("公历".equals(calendar) && leapMonth) {
            throw new IllegalArgumentException("公历不支持闰月");
        }
    }

    public static AlmanacCalculationRequest from(Map<String, Object> fields) {
        if (fields == null) {
            throw new IllegalArgumentException("请求体必须是有效的JSON对象");
        }
        for (String field : fields.keySet()) {
            if (!FIELDS.contains(field)) {
                throw new IllegalArgumentException("请求包含不支持的参数");
            }
        }
        Object leap = fields.getOrDefault("是否闰月", "否");
        if (!"是".equals(leap) && !"否".equals(leap)) {
            throw new IllegalArgumentException("是否闰月必须为是或否");
        }
        Object calendar = fields.get("历法");
        return new AlmanacCalculationRequest(calendar instanceof String value ? value : null,
                integer(fields, "年", null), integer(fields, "月", null), integer(fields, "日", null),
                integer(fields, "时", 0), integer(fields, "分", 0), integer(fields, "秒", 0),
                "是".equals(leap));
    }

    private static int integer(Map<String, Object> fields, String name, Integer defaultValue) {
        if (!fields.containsKey(name) && defaultValue != null) {
            return defaultValue;
        }
        if (fields.get(name) instanceof Integer value) {
            return value;
        }
        throw new IllegalArgumentException(name + "必须为整数");
    }

    private static void requireRange(String name, int value, int minimum, int maximum) {
        if (value < minimum || value > maximum) {
            throw new IllegalArgumentException(name + "必须在" + minimum + "至" + maximum + "之间");
        }
    }
}
