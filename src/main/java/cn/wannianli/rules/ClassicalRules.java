package cn.wannianli.rules;

import java.util.*;
import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SexagenaryCycle.Cycle;
import tools.jackson.databind.json.JsonMapper;

/** Versioned transcription shared with the independent Worker, not numeric weights. */
public final class ClassicalRules {
    private static final Map<String, Object> TEXT = load();
    private ClassicalRules() { }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        try (var input = ClassicalRules.class.getClassLoader().getResourceAsStream("rules/volume10.json")) {
            if (input == null) throw new IllegalStateException("Missing classical rule table");
            return JsonMapper.builder().build().readValue(input, Map.class);
        } catch (java.io.IOException error) { throw new ExceptionInInitializerError(error); }
    }

    public static List<String> strings(Map<String, Object> entry, String key) {
        if (!(entry.get(key) instanceof List<?> list)) return List.of();
        return list.stream().map(String.class::cast).toList();
    }

    @SuppressWarnings("unchecked")
    public static List<Map<String, Object>> rows(Map<String, Object> parent, String key) {
        return (List<Map<String, Object>>) parent.getOrDefault(key, List.of());
    }

    @SuppressWarnings("unchecked")
    public static Map<String, Object> placement() { return (Map<String, Object>) TEXT.get("placement"); }

    public static Map<String, Object> absolute(Cycle month, Cycle day) {
        return rows(TEXT, "absoluteDays").stream().filter(entry -> entry.get("month").equals(month.branchIndex())
                && strings(entry, "days").contains(day.name())).findFirst().orElse(Map.of());
    }

    public static Map<String, Object> pressing(Cycle month, Cycle day) {
        return rows(TEXT, "pressingDays").stream().filter(entry -> entry.get("month").equals(month.branchIndex())
                && strings(entry, "days").contains(day.name())).findFirst().orElse(Map.of());
    }

    public static boolean universalRelief(Cycle month, Cycle day) {
        return rows(TEXT, "universalReliefDays").stream().anyMatch(entry -> entry.get("month").equals(month.branchIndex())
                && entry.get("day").equals(day.name()));
    }

    @SuppressWarnings("unchecked")
    public static List<String> absoluteLabels(Cycle month, Cycle day) {
        var labels = absolute(month, day).get("labels");
        return labels instanceof Map<?, ?> ? strings((Map<String, Object>) labels, day.name()) : List.of();
    }

    public static List<Map<String, Object>> recommendSuppressionLinks() { return rows(TEXT, "recommendSuppressionLinks"); }

    public static Map<String, Object> monthly(Cycle month, TraditionalAlmanac almanac) {
        var selected = rows(TEXT, "monthly").stream().filter(entry -> entry.get("officer").equals(almanac.dayOfficer().name())
                && ((List<?>) entry.get("months")).contains(month.branchIndex())
                && (!entry.containsKey("anyGood") || strings(entry, "anyGood").stream().anyMatch(almanac.gods().auspicious()::contains)))
                .findFirst().orElse(Map.of());
        boolean pressure = almanac.gods().inauspicious().stream().anyMatch(Set.of("四废", "岁薄", "逐阵")::contains)
                && strings(selected, "relieveOnVictory").stream().anyMatch(Set.of("HEAVEN_OFFICIAL", "GREAT_TIME")::contains);
        if (!pressure) return selected;
        var adjusted = new LinkedHashMap<>(selected);
        adjusted.put("grade", "UNDETERMINED");
        adjusted.put("relieveOnVictory", List.of());
        return adjusted;
    }

    public static boolean fromAvoid(ActivityResult.DayGrade grade, boolean relief) {
        return grade == ActivityResult.DayGrade.INFERIOR || grade == ActivityResult.DayGrade.LOWEST
                || !relief && (grade == ActivityResult.DayGrade.MIDDLE || grade == ActivityResult.DayGrade.MIDDLE_SECOND);
    }

    public static Set<String> suppressRecommendations(List<ActivityResult.RuleHit> hits, Cycle day) {
        var result = new LinkedHashSet<String>();
        for (var entry : rows(placement(), "suppressRecommend")) {
            if (hits.stream().anyMatch(hit -> hit.ruleId().equals(entry.get("id")))) result.addAll(strings(entry, "activities"));
        }
        if (hits.stream().anyMatch(hit -> hit.ruleId().startsWith("EARTHWORK_"))) result.add("塞穴");
        for (var key : List.of("branchSuppression", "stemSuppression")) {
            @SuppressWarnings("unchecked") var table = (Map<String, Object>) placement().get(key);
            result.addAll(strings(table, Integer.toString(key.equals("branchSuppression") ? day.branchIndex() : day.stemIndex())));
        }
        return result;
    }
}
