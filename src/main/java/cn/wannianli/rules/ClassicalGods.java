package cn.wannianli.rules;

import java.util.*;
import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SexagenaryCycle.Cycle;
import cn.wannianli.rules.ActivityResult.RuleHit;
import tools.jackson.databind.json.JsonMapper;

/** Shared, versioned starts and activity exceptions; no numeric strengths. */
public final class ClassicalGods {
    private static final Map<String, Object> TEXT = load();
    private static final List<Map<String, Object>> RULES = ClassicalRules.rows(TEXT, "rules");
    private ClassicalGods() { }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> load() {
        try (var input = ClassicalGods.class.getClassLoader().getResourceAsStream("rules/core-gods.json")) {
            if (input == null) throw new IllegalStateException("Missing core god rules");
            return JsonMapper.builder().build().readValue(input, Map.class);
        } catch (java.io.IOException error) { throw new ExceptionInInitializerError(error); }
    }

    @SuppressWarnings("unchecked")
    public static List<String> noSalaryAllowed() { return ClassicalRules.strings((Map<String, Object>) TEXT.get("noSalary"), "allowedActivities"); }

    @SuppressWarnings("unchecked")
    public static boolean isNoSalary(Cycle year, Cycle month, Cycle day, double longitude, List<String> good) {
        var rule = (Map<String, Object>) TEXT.get("noSalary");
        if (!ClassicalRules.strings(rule, "candidates").contains(day.name())) return false;
        if (day.name().equals("癸亥")) return true;
        int salary = ((Number) ((List<?>) rule.get("salaryBranches")).get(day.stemIndex())).intValue();
        int sun = Math.floorMod(22 - (int) Math.floor(longitude / 30), 12);
        if (good.stream().anyMatch(Set.of("天德", "月德")::contains)
                || salary == year.branchIndex() || salary == month.branchIndex() || salary == sun
                || day.stemIndex() == year.stemIndex() || day.stemIndex() == month.stemIndex()) return false;
        return ClassicalRules.rows(rule, "yearMonthRelief").stream().noneMatch(entry ->
                ((List<?>) entry.get("years")).contains(year.stemIndex())
                && ((List<?>) entry.get("months")).contains(month.branchIndex()) && entry.get("day").equals(day.name()));
    }

    private static boolean tableContains(Map<String, Object> entry, String key, int index, Object value) {
        return entry.get(key) instanceof List<?> table && table.get(index) instanceof List<?> row && row.contains(value);
    }

    public static void addGods(List<String> good, List<String> bad, Cycle year, Cycle month, Cycle day, double longitude) {
        int ordinal = Math.floorMod(month.branchIndex() - 2, 12), season = ordinal / 3;
        for (var entry : RULES) {
            int index = Integer.valueOf(0).equals(entry.get("monthBranchOrigin")) ? month.branchIndex() : ordinal;
            boolean matches = ClassicalRules.strings(entry, "days").contains(day.name())
                    || entry.get("branches") instanceof List<?> list && list.contains(day.branchIndex())
                    || tableContains(entry, "seasonDays", season, day.name())
                    || tableContains(entry, "seasonBranches", season, day.branchIndex())
                    || tableContains(entry, "monthDays", index, day.name())
                    || tableContains(entry, "monthBranches", index, day.branchIndex())
                    || tableContains(entry, "monthStems", index, day.stemIndex());
            if (!matches) continue;
            if (Boolean.TRUE.equals(entry.get("contextual")) && !isNoSalary(year, month, day, longitude, good)) continue;
            var target = "good".equals(entry.get("nature")) ? good : bad;
            String name = (String) entry.get("name");
            if (!target.contains(name)) target.add(name);
            var aliases = ClassicalRules.strings(entry, "seasonAliases");
            if (!aliases.isEmpty() && !target.contains(aliases.get(season))) target.add(aliases.get(season));
        }
    }

    public static List<String> aversionAvoids() {
        return RULES.stream().filter(entry -> entry.get("id").equals("MONTH_AVERSION"))
                .findFirst().map(entry -> ClassicalRules.strings(entry, "avoids")).orElseThrow();
    }

    public static List<RuleHit> hits(Cycle month, Cycle day, TraditionalAlmanac almanac) {
        var hits = new ArrayList<RuleHit>();
        var good = almanac.gods().auspicious();
        var bad = almanac.gods().inauspicious();
        for (var entry : RULES) {
            if (!("good".equals(entry.get("nature")) ? good : bad).contains(entry.get("name"))) continue;
            boolean soft = Boolean.TRUE.equals(entry.get("soft"));
            String id = (String) entry.get("id"), name = (String) entry.get("name");
            var avoids = ClassicalRules.strings(entry, "avoids");
            hits.add(hit(soft ? id : "CLASSICAL_RAW_" + id, name, ClassicalRules.strings(entry, "recommends"), avoids,
                    "共享表保留原始用事；明确解忌仅撤销本条，其他专忌保留。"));
            boolean hard = ClassicalRules.rows(entry, "hardExceptions").stream().anyMatch(condition ->
                    ((List<?>) condition.get("months")).contains(month.branchIndex()) && ClassicalRules.strings(condition, "days").contains(day.name()));
            if (hard) hits.add(hit(id + "_HARD_RETAINED_TABOOS", name, List.of(), avoids, "卷十六月己未阳错、己巳阴错，不从德合所宜。"));
            if (soft || avoids.isEmpty()) continue;
            boolean relieved = ClassicalRules.strings(entry, "delegateTo").stream().anyMatch(bad::contains)
                    || ClassicalRules.rows(entry, "relief").stream().anyMatch(condition ->
                    (!condition.containsKey("months") || ((List<?>) condition.get("months")).contains(month.branchIndex()))
                    && ClassicalRules.strings(condition, "anyGood").stream().anyMatch(good::contains));
            var remaining = relieved ? ClassicalRules.strings(entry, "retainedOnRelief") : avoids;
            if (!remaining.isEmpty()) hits.add(hit("CLASSICAL_ACTIVE_" + id + "_RETAINED_TABOOS", name, List.of(), remaining,
                    relieved ? "明确解忌后仍保留的用事。" : "未满足本条指定解忌条件，不能用通用日等解除。"));
        }
        return hits;
    }

    private static RuleHit hit(String id, String name, List<String> recommends, List<String> avoids, String note) {
        return new RuleHit(id, name, "共享神煞用事", "XIEJI_BIANFANGSHU_VOLUME_10", "B_PRIMARY_TEXT_TRANSCRIPTION",
                recommends, avoids, "卷五最终校订起例或卷十逐月起例", note);
    }
}
