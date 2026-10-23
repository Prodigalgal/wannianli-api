package cn.wannianli.api;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import cn.wannianli.config.ApiRequestGuard;
import cn.wannianli.service.AlmanacService;

@Component
public final class RangeCalculator {
    public static final int MAX_DAYS = 14, MAX_BYTES = 262144;
    public static final String GUARD_ATTRIBUTE = "wannianli.requestGuard";
    private final AlmanacService service;
    private final ApiContract contract;
    public RangeCalculator(AlmanacService service, ApiContract contract) { this.service = service; this.contract = contract; }

    public Map<String, Object> calculate(Object input, HttpServletRequest request, boolean headersOnly) {
        if (!(input instanceof Map<?, ?> fields) || fields.keySet().stream().anyMatch(key -> !Set.of("startDate", "endDate", "time").contains(key)))
            throw new IllegalArgumentException("区间仅接受startDate、endDate和time");
        Object time = fields.containsKey("time") ? fields.get("time") : "00:00:00";
        var first = SemanticRequest.from(single(fields.get("startDate"), time));
        var last = SemanticRequest.from(single(fields.get("endDate"), time));
        LocalDate start, end;
        try { start = LocalDate.of(first.year(), first.month(), first.day()); end = LocalDate.of(last.year(), last.month(), last.day()); }
        catch (DateTimeException error) { throw new IllegalArgumentException("公历日期不存在"); }
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        if (days < 1 || days > MAX_DAYS) throw new IllegalArgumentException("区间必须按公历升序，含首尾最多14天");
        if (headersOnly) return Map.of();
        if (!(request.getAttribute(GUARD_ATTRIBUTE) instanceof ApiRequestGuard guard))
            throw new AlmanacApiException(HttpStatus.SERVICE_UNAVAILABLE, "计算配额保护不可用");
        if (guard.chargeAdditional((int) days - 1) != ApiRequestGuard.Decision.ALLOWED)
            throw new AlmanacApiException(HttpStatus.TOO_MANY_REQUESTS, "计算配额不足，请稍后重试");
        var results = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < days; i++) results.add(contract.result(service.calculateAt(ZonedDateTime.of(start.plusDays(i),
                LocalTime.of(first.hour(), first.minute(), first.second()), ZoneOffset.ofHours(8)))));
        String normalizedTime = String.format(java.util.Locale.ROOT, "%02d:%02d:%02d", first.hour(), first.minute(), first.second());
        var value = new LinkedHashMap<String, Object>();
        value.put("schemaVersion", "2.0"); value.put("utcOffset", "+08:00");
        value.put("range", Map.of("startDate", start.toString(), "endDate", end.toString(), "time", normalizedTime, "days", days, "quotaUnits", days));
        value.put("results", results);
        if (contract.encode(value).getBytes(StandardCharsets.UTF_8).length > MAX_BYTES)
            throw new AlmanacApiException(HttpStatus.PAYLOAD_TOO_LARGE, "区间结果超过262144字节上限，请缩小区间");
        return value;
    }
    private Map<String, Object> single(Object date, Object time) {
        var value = new LinkedHashMap<String, Object>(); value.put("date", date); value.put("time", time); return value;
    }
}
