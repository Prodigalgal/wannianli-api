package cn.wannianli.service;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import cn.wannianli.almanac.TraditionalAlmanacCalculator;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.rules.ClassicalRules;
import cn.wannianli.rules.ClassicalGods;
import tools.jackson.databind.json.JsonMapper;

class FourthAuditRegressionTest {
    private final AlmanacService service = new AlmanacService(Clock.fixed(Instant.parse("2026-08-03T04:00:00Z"), ZoneOffset.ofHours(8)));
    private cn.wannianli.api.AlmanacResponse at(String date) {
        return service.calculateAt(ZonedDateTime.parse(date + "T12:00:00+08:00"));
    }
    private SexagenaryCycle.Cycle cycle(String name) {
        return java.util.stream.IntStream.range(0, 60).mapToObj(SexagenaryCycle::fromIndex)
                .filter(value -> value.name().equals(name)).findFirst().orElseThrow();
    }
    @SuppressWarnings("unchecked")
    private Map<String, Object> fixture() throws Exception {
        try (var stream = getClass().getResourceAsStream("/fixtures/classical-second-batch.json")) {
            return JsonMapper.builder().build().readValue(stream, Map.class);
        }
    }

    @Test
    void secondMonthlyBatchAndAbsoluteExceptionsFollowTheSource() throws Exception {
        var data = fixture();
        for (var row : (List<?>) data.get("monthly")) {
            var pair = (List<?>) row;
            assertThat(at((String) pair.get(0)).activities().dayGrade().classicalName()).as(pair.get(0).toString()).isEqualTo(pair.get(1));
        }
        for (var date : (List<?>) data.get("absolute")) {
            var value = at(date.toString()).activities();
            assertThat(value.allActivitiesAvoided()).isTrue(); assertThat(value.recommended()).isEmpty();
        }
        assertThat(at("2020-01-03").activities().virtuePresent()).isTrue();
        assertThat(at("2020-01-03").activities().avoided()).contains("祈福");
    }

    @Test
    void barkingUsesCorrectedThirteenAndElevenDaysAndFiveClassesPartitionTheCycle() throws Exception {
        var calculator = new TraditionalAlmanacCalculator();
        var barking = new ArrayList<String>(); var opposite = new ArrayList<String>();
        var counts = new LinkedHashMap<String, Integer>();
        for (String name : List.of("宝日", "义日", "制日", "专日", "伐日")) counts.put(name, 0);
        for (int i = 0; i < 60; i++) {
            var day = SexagenaryCycle.fromIndex(i);
            var gods = calculator.calculate(LocalDate.of(2026, 3, 1), SexagenaryCycle.fromIndex(2), day, 330).gods();
            if (gods.auspicious().contains("鸣吠")) barking.add(day.name());
            if (gods.auspicious().contains("鸣吠对")) opposite.add(day.name());
            var names = counts.keySet().stream().filter(name -> gods.auspicious().contains(name) || gods.inauspicious().contains(name)).toList();
            assertThat(names).hasSize(1); counts.compute(names.getFirst(), (key, value) -> value + 1);
        }
        assertThat(barking).containsExactlyInAnyOrderElementsOf(ClassicalRules.strings(fixture(), "barking"));
        assertThat(opposite).containsExactlyInAnyOrderElementsOf(ClassicalRules.strings(fixture(), "barkingOpposite"));
        assertThat(counts.values()).allMatch(count -> count == 12);
    }

    @Test
    void eightWindsUseFinalEditorialStarts() {
        var calculator = new TraditionalAlmanacCalculator();
        for (var example : List.of(new String[]{"2", "丁巳", "true"}, new String[]{"2", "己酉", "false"},
                new String[]{"8", "丁亥", "true"}, new String[]{"8", "辛未", "false"})) {
            var day = java.util.stream.IntStream.range(0, 60).mapToObj(SexagenaryCycle::fromIndex)
                    .filter(value -> value.name().equals(example[1])).findFirst().orElseThrow();
            var gods = calculator.calculate(LocalDate.of(2026, 3, 1), SexagenaryCycle.fromIndex(Integer.parseInt(example[0])), day, 330).gods();
            assertThat(gods.inauspicious().contains("八风")).isEqualTo(Boolean.parseBoolean(example[2]));
        }
    }

    @Test
    void retainedTaboosNamedReliefAndPressingPlacementHoldAcrossFiveYears() {
        int relieved = 0, absolute = 0, pressing = 0;
        for (var date = LocalDate.of(2020, 1, 1); date.isBefore(LocalDate.of(2025, 1, 1)); date = date.plusDays(1)) {
            var value = at(date.toString()); var result = value.activities();
            var month = cycle(value.fourPillars().month().value()); var day = cycle(value.fourPillars().day().value());
            if (ClassicalRules.universalRelief(month, day)) { assertThat(result.avoided()).isEmpty(); relieved++; continue; }
            for (var hit : result.ruleHits()) if (hit.ruleId().startsWith("CLASSICAL_ACTIVE_")) {
                for (String activity : hit.avoids()) {
                    if (value.traditionalAlmanac().gods().inauspicious().contains("无禄") && !ClassicalGods.noSalaryAllowed().contains(activity))
                        assertThat(result.decisions()).filteredOn(d -> d.activity().equals(activity)).singleElement()
                                .satisfies(d -> assertThat(d.disposition()).isEqualTo(cn.wannianli.rules.ActivityResult.Disposition.OMITTED));
                    else assertThat(result.avoided()).contains(activity);
                }
            }
            if (!ClassicalRules.absolute(month, day).isEmpty()) { assertThat(result.allActivitiesAvoided()).isTrue(); absolute++; }
            if (!ClassicalRules.pressing(month, day).isEmpty()) {
                var row = result.ruleHits().stream().filter(hit -> hit.ruleId().equals("PRESSING_PLACEMENT")).findFirst().orElseThrow();
                assertThat(result.recommended()).doesNotContainAnyElementsOf(row.avoids()); pressing++;
            }
        }
        assertThat(relieved).isGreaterThan(10); assertThat(absolute).isGreaterThan(20); assertThat(pressing).isGreaterThan(10);
    }

    @Test
    void noSalaryHonorsSolarFillingConjunctionsAndGuiHaiException() {
        var year = SexagenaryCycle.fromIndex(20); var month = SexagenaryCycle.fromIndex(2); var day = SexagenaryCycle.fromIndex(8);
        assertThat(ClassicalGods.isNoSalary(year, month, day, 329.999, List.of("天德合"))).isTrue();
        assertThat(ClassicalGods.isNoSalary(year, month, day, 330, List.of("天德合"))).isFalse();
        assertThat(ClassicalGods.isNoSalary(year, month, day, 329.999, List.of("月德"))).isFalse();
        assertThat(ClassicalGods.isNoSalary(SexagenaryCycle.fromIndex(8), month, day, 329.999, List.of())).isFalse();
        var guiHai = SexagenaryCycle.fromIndex(59);
        assertThat(ClassicalGods.isNoSalary(guiHai, guiHai, guiHai, 300, List.of("天德", "月德"))).isTrue();
        for (var entry : List.of(Map.entry(2024, cn.wannianli.calendar.astronomy.SolarTerm.MAJOR_HEAT),
                Map.entry(2039, cn.wannianli.calendar.astronomy.SolarTerm.RAIN_WATER))) {
            var instant = cn.wannianli.calendar.astronomy.SolarEphemeris.solarTermInstant(entry.getKey(), entry.getValue(), ZoneOffset.ofHours(8));
            assertThat(service.calculateAt(instant.minusMillis(1).atZone(ZoneOffset.ofHours(8))).traditionalAlmanac().gods().inauspicious()).contains("无禄");
            assertThat(service.calculateAt(instant.atZone(ZoneOffset.ofHours(8))).traditionalAlmanac().gods().inauspicious()).doesNotContain("无禄");
        }
        int found = 0;
        for (var date = LocalDate.of(2024, 1, 1); date.isBefore(LocalDate.of(2025, 1, 1)); date = date.plusDays(1)) {
            var value = at(date.toString());
            if (value.traditionalAlmanac().gods().inauspicious().contains("无禄")) {
                var allowed = ClassicalGods.noSalaryAllowed();
                assertThat(value.activities().recommended()).allMatch(allowed::contains);
                assertThat(value.activities().avoided()).allMatch(allowed::contains);
                assertThat(value.activities().caution()).allMatch(allowed::contains); found++;
            }
        }
        assertThat(found).isGreaterThan(10);
    }

    @Test
    void proclamationChangesAndJuneErrorDaysPreserveTheSpecificTaboos() {
        var changed = at("2020-01-09").activities();
        assertThat(changed.recommended()).contains("布政事").doesNotContain("宣政事", "颁诏", "施恩封拜", "诏命公卿", "招贤", "举正直");
        for (String date : List.of("2020-07-15", "2020-07-25")) {
            var value = at(date).activities();
            assertThat(value.virtuePresent()).isTrue(); assertThat(value.avoided()).contains("求医", "安葬");
        }
    }
}
