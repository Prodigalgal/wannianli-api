package cn.wannianli.rules;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import cn.wannianli.api.AlmanacResponse;
import cn.wannianli.api.ApiContract;
import cn.wannianli.calendar.ChineseCalendarCalculator;
import cn.wannianli.calendar.ChineseCalendarDate;
import cn.wannianli.rules.ActivityResult.ActivityDecision;
import cn.wannianli.rules.ActivityResult.Disposition;
import cn.wannianli.service.AlmanacService;

class CalendarDayRulesTest {
    private static final ZoneOffset ZONE = ZoneOffset.ofHours(8);
    private final AlmanacService service = new AlmanacService(Clock.systemUTC());

    @SuppressWarnings("unchecked")
    private static Map<String,Object> fixture() throws Exception {
        try (var input = CalendarDayRulesTest.class.getResourceAsStream("/fixtures/calendar-days.json")) {
            return JsonMapper.builder().build().readValue(input,Map.class);
        }
    }
    private AlmanacResponse at(String date) { return at(date,"12:00:00"); }
    private AlmanacResponse at(String date,String time) {
        return service.calculateAt(LocalDate.parse(date).atTime(LocalTime.parse(time)).atZone(ZONE));
    }
    private static ActivityDecision decision(AlmanacResponse value,String activity) {
        return value.activities().decisions().stream().filter(d->d.activity().equals(activity)).findFirst().orElseThrow();
    }
    private static CalendarDayRules.Context rules(String date) {
        var day=LocalDate.parse(date);
        return CalendarDayRules.calculate(day,new ChineseCalendarCalculator(ZONE).calculate(day));
    }
    private static void unprinted(AlmanacResponse value,String activity) {
        assertThat(value.activities().recommended()).doesNotContain(activity);
        assertThat(value.activities().avoided()).doesNotContain(activity);
        assertThat(value.activities().caution()).doesNotContain(activity);
    }

    @Test @SuppressWarnings("unchecked")
    void publicAnnotationPoliciesMatchTheIndependentSourceLists() throws Exception {
        var data=fixture();
        var capabilities=(Map<String,Object>) new ApiContract(JsonMapper.builder().build()).get("capabilities");
        var policies=(Map<String,Object>) capabilities.get("annotationPolicies");
        var monthly=(Map<String,Object>) policies.get("monthlyTaboo");
        var terms=(Map<String,Object>) policies.get("equinoxSolstice");
        assertThat(monthly.get("triggerGod")).isEqualTo("月忌日");
        assertThat((List<Integer>) monthly.get("lunarDays")).containsExactly(5,14,23);
        assertThat(ClassicalRules.strings(monthly,"allowedActivities")).isEqualTo(ClassicalRules.strings(data,"monthlyAllowed"));
        assertThat(ClassicalRules.strings(terms,"triggerGods")).containsExactly("春分","夏至","秋分","冬至");
        assertThat(ClassicalRules.strings(terms,"omittedActivities")).isEqualTo(ClassicalRules.strings(data,"termOmissions"));
        assertThat(ClassicalRules.strings(terms,"winterAdditionalOmissions")).containsExactly("伐木");
    }

    @Test
    void twelveGoldenDatesUseInclusiveCountingWithoutAnExtraDay() throws Exception {
        var data=fixture();
        for(String date:ClassicalRules.strings(data,"qiGoingLoss2026")) {
            assertThat(rules(date).names()).as(date).contains("气往亡");
            assertThat(rules(LocalDate.parse(date).minusDays(1).toString()).names()).doesNotContain("气往亡");
            assertThat(rules(LocalDate.parse(date).plusDays(1).toString()).names()).doesNotContain("气往亡");
            assertThat(rules(date).hits().stream().filter(h->h.name().equals("气往亡")).findFirst().orElseThrow().avoids())
                    .containsExactlyElementsOf(ClassicalRules.strings(data,"qiAvoids"));
        }
    }

    @Test @SuppressWarnings("unchecked")
    void allTwelveSuppliedNewMoonBranchesAndARealVirtueConjunctionAreChecked() throws Exception {
        var data=fixture();
        // Controlled branch inputs, not twelve claimed real consecutive lunar month starts.
        for(var row:(List<List<Object>>) data.get("reversedBranchCases")) {
            var first=LocalDate.parse((String) row.get(0));int expected=((Number) row.get(2)).intValue();
            for(int day=1;day<=7;day++) {
                var lunar=new ChineseCalendarDate(2000,1,day,false,30,first,Instant.EPOCH,"");
                assertThat(CalendarDayRules.calculate(first.plusDays(day-1),lunar).names().contains("反支"))
                        .as("%s朔 第%s日",row.get(1),day).isEqualTo(day==expected);
            }
        }
        var value=at("2026-02-17");
        assertThat(value.lunar().day()).isEqualTo(1);
        assertThat(value.fourPillars().day().earthlyBranch()).isEqualTo("戌");
        assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("反支");
        assertThat(value.activities().virtuePresent()).isTrue();
        assertThat(value.activities().ruleHits().stream().filter(h->h.name().equals("反支")).findFirst().orElseThrow().avoids())
                .containsExactlyElementsOf(ClassicalRules.strings(data,"reverseAvoids"));
        for(String activity:ClassicalRules.strings(data,"reverseAvoids")) {
            assertThat(decision(value,activity).disposition()).isEqualTo(Disposition.AVOID);
            assertThat(decision(value,activity).avoidedBy()).contains("CALENDAR_REVERSED_BRANCH_RETAINED_TABOOS");
        }
    }

    @Test
    void superiorVirtueDayKeepsQiTaboosAndTransfersOnlyProclamationRecommendationEvidence() throws Exception {
        var value=at("2020-04-24");
        assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("气往亡").doesNotContain("往亡");
        assertThat(value.activities().dayGrade()).isEqualTo(ActivityResult.DayGrade.SUPERIOR);
        assertThat(value.activities().virtuePresent()).isTrue();
        for(String activity:ClassicalRules.strings(fixture(),"qiAvoids"))
            assertThat(decision(value,activity).disposition()).as(activity).isEqualTo(Disposition.AVOID);
        assertThat(decision(value,"布政事").disposition()).isEqualTo(Disposition.RECOMMENDED);
        assertThat(decision(value,"布政事").recommendedBy()).containsExactlyElementsOf(decision(value,"宣政事").recommendedBy());
        assertThat(decision(value,"布政事").avoidedBy()).noneMatch(id->id.contains("GOING_LOSS"));
        assertThat(value.activities().ruleHits().stream().filter(h->h.name().equals("气往亡")).findFirst().orElseThrow().avoids())
                .doesNotContain("施恩封拜");
    }

    @Test @SuppressWarnings("unchecked")
    void termDaysOmitBothDirectionsForWholeCivilDayAndWinterAlsoOmitsWoodcutting() throws Exception {
        var data=fixture();
        for(var row:((Map<String,String>) data.get("termDates2026")).entrySet()) {
            for(String time:List.of("00:00:00","23:59:59")) {
                var value=at(row.getKey(),time);
                assertThat(value.traditionalAlmanac().gods().inauspicious()).contains(row.getValue());
                for(String activity:ClassicalRules.strings(data,"termOmissions"))unprinted(value,activity);
            }
            assertThat(at(LocalDate.parse(row.getKey()).minusDays(1).toString()).traditionalAlmanac().gods().inauspicious()).doesNotContain(row.getValue());
            assertThat(at(LocalDate.parse(row.getKey()).plusDays(1).toString()).traditionalAlmanac().gods().inauspicious()).doesNotContain(row.getValue());
        }
        var winter=at("2024-12-21");
        assertThat(winter.lunar().day()).isEqualTo(21);
        assertThat(decision(winter,"伐木").recommendedBy()).isNotEmpty();
        assertThat(decision(winter,"伐木").disposition()).isEqualTo(Disposition.OMITTED);
        assertThat(decision(winter,"嫁娶").avoidedBy()).isNotEmpty();
        assertThat(decision(winter,"嫁娶").disposition()).isEqualTo(Disposition.OMITTED);
        var spring=at("2024-03-20");
        assertThat(decision(spring,"嫁娶").recommendedBy()).isNotEmpty();
        assertThat(decision(spring,"嫁娶").disposition()).isEqualTo(Disposition.OMITTED);
    }

    @Test @SuppressWarnings("unchecked")
    void monthlyTabooUsesLunarDayIncludingLeapMonthAndOnlyTheTwelveFinalClasses() throws Exception {
        var data=fixture();var allowed=ClassicalRules.strings(data,"monthlyAllowed");int checked=0;
        for(int year:List.of(2020,2024)) for(var date=LocalDate.of(year,1,1);date.isBefore(LocalDate.of(year+1,1,1));date=date.plusDays(1)) {
            var value=at(date.toString());boolean expected=List.of(5,14,23).contains(value.lunar().day());
            assertThat(value.traditionalAlmanac().gods().inauspicious().contains("月忌日")).as(date.toString()).isEqualTo(expected);
            if(!expected)continue;
            assertThat(value.activities().recommended()).allMatch(allowed::contains);
            assertThat(value.activities().avoided()).allMatch(allowed::contains);
            assertThat(value.activities().caution()).allMatch(allowed::contains);checked++;
        }
        assertThat(checked).isGreaterThanOrEqualTo(72);
        for(var row:(List<List<Object>>) data.get("leapMonthTaboos")) {
            var value=at((String) row.get(0));
            assertThat(value.lunar().leapMonth()).isTrue();
            assertThat(value.lunar().day()).isEqualTo(((Number) row.get(1)).intValue());
            assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("月忌日");
        }
    }

    @Test
    void unprintedTaboosRetainRawEvidenceInsteadOfBecomingFavorable() {
        for(var row:Map.of("2024-01-04",List.of("安床","开仓库"),"2020-07-25",List.of("安葬")).entrySet()) {
            var value=at(row.getKey());assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("月忌日");
            for(String activity:row.getValue()) {
                assertThat(decision(value,activity).avoidedBy()).isNotEmpty();
                assertThat(decision(value,activity).disposition()).isEqualTo(Disposition.OMITTED);unprinted(value,activity);
            }
        }
        var overlap=at("2026-02-10");
        assertThat(overlap.traditionalAlmanac().gods().inauspicious()).contains("气往亡","月忌日");
        assertThat(decision(overlap,"求医").disposition()).isEqualTo(Disposition.AVOID);
        assertThat(decision(overlap,"上册进表章").disposition()).isEqualTo(Disposition.OMITTED);
    }
}
