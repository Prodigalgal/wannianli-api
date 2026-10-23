package cn.wannianli.rules;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.ChineseCalendarDate;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;
import cn.wannianli.rules.ActivityResult.RuleHit;
import tools.jackson.databind.json.JsonMapper;

/** Calendar-dependent volume-ten clauses use the already calculated lunar month. */
public final class CalendarDayRules {
    private static final Map<String,Object> TEXT = load();
    private static final ZoneOffset ZONE = ZoneOffset.ofHours(8);
    private CalendarDayRules() { }

    @SuppressWarnings("unchecked")
    private static Map<String,Object> load() {
        try (var input = CalendarDayRules.class.getClassLoader().getResourceAsStream("rules/calendar-days.json")) {
            if (input == null) throw new IllegalStateException("Missing calendar-day rules");
            return JsonMapper.builder().build().readValue(input, Map.class);
        } catch (java.io.IOException error) { throw new ExceptionInInitializerError(error); }
    }

    @SuppressWarnings("unchecked")
    private static Map<String,Object> rule(String key) { return (Map<String,Object>) TEXT.get(key); }

    private static RuleHit hit(Map<String,Object> entry, String name, String reason) {
        return new RuleHit((String) entry.get("id"), name, "历日专例", "XIEJI_BIANFANGSHU_VOLUME_10",
                "B_PRIMARY_TEXT_TRANSCRIPTION", List.of(), ClassicalRules.strings(entry,"avoids"), reason, (String) entry.get("note"));
    }

    private static LocalDate termDate(int year, String key) {
        return SolarEphemeris.solarTermInstant(year, SolarTerm.valueOf(key), ZONE).atOffset(ZONE).toLocalDate();
    }

    public static Context calculate(LocalDate date, ChineseCalendarDate lunar) {
        var hits = new ArrayList<RuleHit>();
        var qi = rule("qiGoingLoss");
        for (var entry : ClassicalRules.rows(qi,"terms")) {
            String key = (String) entry.get("term");
            var start = termDate(date.getYear(),key);
            int day = ((Number) entry.get("inclusiveDay")).intValue();
            if (date.equals(start.plusDays(day - 1))) {
                hits.add(hit(qi,(String) qi.get("name"), start + "交" + SolarTerm.valueOf(key).chineseName() + "，含首日第" + day + "日"));
                break;
            }
        }
        var reverse = rule("reversedBranch");
        int firstBranch = SexagenaryCycle.day(lunar.monthStartDate()).branchIndex();
        int reversedDay = ((Number) ((List<?>) reverse.get("lunarDayByNewMoonBranch")).get(firstBranch)).intValue();
        if (lunar.day() == reversedDay)
            hits.add(hit(reverse,(String) reverse.get("name"), "本月朔日" + lunar.monthStartDate() + "地支索引" + firstBranch + "，农历第" + lunar.day() + "日"));
        var terms = rule("equinoxSolstice");
        for (String key : ClassicalRules.strings(terms,"terms")) {
            if (date.equals(termDate(date.getYear(),key)))
                hits.add(hit(terms,SolarTerm.valueOf(key).chineseName(), "交" + SolarTerm.valueOf(key).chineseName() + "所在UTC+08:00民用日"));
        }
        var monthly = rule("monthlyTaboo");
        if (((List<?>) monthly.get("lunarDays")).contains(lunar.day()))
            hits.add(hit(monthly,(String) monthly.get("name"), "农历第" + lunar.day() + "日" + (lunar.leapMonth() ? "（闰月）" : "")));
        return new Context(hits.stream().map(RuleHit::name).toList(), hits);
    }

    public static TraditionalAlmanac annotate(TraditionalAlmanac almanac, Context context) {
        var bad = new LinkedHashSet<>(almanac.gods().inauspicious());
        bad.addAll(context.names());
        var gods = new TraditionalAlmanac.Gods(almanac.gods().auspicious(),List.copyOf(bad),almanac.gods().virtuePresent());
        return new TraditionalAlmanac(almanac.dayOfficer(),almanac.dutyGod(),gods,almanac.pengZu(),almanac.clash(),almanac.fetalGod(),almanac.mansion());
    }

    public static Set<String> annotationOmissions(List<RuleHit> hits, Collection<String> activities) {
        var omitted = new LinkedHashSet<String>();
        var monthly = rule("monthlyTaboo");
        if (hits.stream().anyMatch(hit -> hit.ruleId().equals(monthly.get("id")))) {
            var allowed = ClassicalRules.strings(monthly,"allowedActivities");
            for (String activity : activities) if (!allowed.contains(activity)) omitted.add(activity);
        }
        var terms = rule("equinoxSolstice");
        hits.stream().filter(hit -> hit.ruleId().equals(terms.get("id"))).findFirst().ifPresent(hit -> {
            omitted.addAll(ClassicalRules.strings(terms,"omittedActivities"));
            if (hit.name().equals("冬至")) omitted.addAll(ClassicalRules.strings(terms,"winterAdditionalOmissions"));
        });
        return omitted;
    }

    public record Context(List<String> names, List<RuleHit> hits) {
        public Context { names = List.copyOf(names); hits = List.copyOf(hits); }
        public static Context empty() { return new Context(List.of(),List.of()); }
    }
}
