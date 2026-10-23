package cn.wannianli.rules;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.rules.ActivityResult.RuleHit;
import cn.wannianli.service.AlmanacService;

class VolumeSixGodsTest {
    @SuppressWarnings("unchecked")
    private static Map<String, Object> fixture() throws Exception {
        try (var input = VolumeSixGodsTest.class.getResourceAsStream("/fixtures/volume06-month-gods.json")) {
            return JsonMapper.builder().build().readValue(input, Map.class);
        }
    }

    @Test
    @SuppressWarnings("unchecked")
    void allMonthlyStartsFollowTheIndependentBranchTranscription() throws Exception {
        var starts = (Map<String, List<String>>) fixture().get("starts");
        for (int ordinal = 0; ordinal < 12; ordinal++) for (int index = 0; index < 60; index++) {
            var month = SexagenaryCycle.fromIndex((ordinal + 2) % 12);
            var day = SexagenaryCycle.fromIndex(index);
            var good = new ArrayList<String>();
            ClassicalGods.addGods(good, new ArrayList<>(), SexagenaryCycle.fromIndex(0), month, day, 0);
            for (var row : starts.entrySet()) {
                assertThat(good.contains(row.getKey())).as("month %s day %s god %s", ordinal + 1, day.name(), row.getKey())
                        .isEqualTo(row.getValue().get(ordinal).contains(SexagenaryCycle.BRANCHES[day.branchIndex()]));
            }
        }
    }

    private static List<RuleHit> hits(List<String> names, String officer, int month) {
        var almanac = new TraditionalAlmanac(new TraditionalAlmanac.DayOfficer(officer, "", ""), null,
                new TraditionalAlmanac.Gods(names, List.of(), false), null, null, null, null);
        return ClassicalGods.hits(SexagenaryCycle.fromIndex(month), SexagenaryCycle.fromIndex(0), almanac);
    }

    private static List<RuleHit> combinations(List<String> names, String officer, int month) {
        return hits(names, officer, month).stream().filter(h -> h.ruleId().contains("_COMBINATION_")).toList();
    }

    @Test
    @SuppressWarnings("unchecked")
    void finalRitualAndHorseUsesDoNotInheritTheRejectedOldLists() throws Exception {
        var activities = (Map<String, List<String>>) fixture().get("finalActivities");
        for (var row : activities.entrySet()) {
            var base = hits(List.of(row.getKey()), "平", 2).stream()
                    .filter(h -> h.ruleId().startsWith("CLASSICAL_RAW_")).findFirst().orElseThrow();
            assertThat(base.recommends()).as(row.getKey()).containsExactlyElementsOf(row.getValue());
            assertThat(base.avoids()).isEmpty();
        }
    }

    @Test
    void combinationsRequireTheirNamedGodOfficerAndMonth() {
        assertThat(combinations(List.of("天仓", "时德"), "平", 2)).isEmpty();
        assertThat(combinations(List.of("天仓", "四相"), "平", 2)).anySatisfy(h -> assertThat(h.recommends()).contains("修仓库"));
        assertThat(combinations(List.of("天仓"), "开", 2)).anySatisfy(h -> assertThat(h.recommends()).contains("修仓库"));
        assertThat(combinations(List.of("五富", "时德"), "平", 2)).anySatisfy(h -> assertThat(h.recommends()).contains("修仓库"));
        assertThat(combinations(List.of("驿马", "天德"), "平", 2)).isEmpty();
        assertThat(combinations(List.of("驿马", "天恩"), "平", 2)).anySatisfy(h -> assertThat(h.recommends()).contains("颁诏"));
        assertThat(combinations(List.of("天马", "月恩"), "平", 2)).anySatisfy(h -> assertThat(h.recommends()).contains("招贤"));
        assertThat(combinations(List.of("天马"), "除", 11)).anySatisfy(h -> assertThat(h.recommends()).contains("招贤"));
        assertThat(combinations(List.of("天马"), "除", 10)).isEmpty();
        assertThat(combinations(List.of("天马"), "成", 6)).anySatisfy(h -> assertThat(h.recommends()).contains("招贤"));
        assertThat(combinations(List.of("天马"), "成", 7)).isEmpty();
    }

    @Test
    void sourceSpellingOfMovingHouseCannotBypassMonthBreakTaboos() {
        var service = new AlmanacService(Clock.systemUTC());
        int cases = 0;
        for (var date = LocalDate.of(2024, 1, 1); date.isBefore(LocalDate.of(2025, 1, 1)); date = date.plusDays(1)) {
            var result = service.calculateAt(date.atTime(12, 0).atZone(ZoneOffset.ofHours(8)));
            for (var hit : result.activities().ruleHits()) {
                if (List.of("驿马", "天马").contains(hit.name())) assertThat(hit.recommends()).doesNotContain("般移");
            }
            var gods = result.traditionalAlmanac().gods();
            if (gods.inauspicious().contains("月破") && gods.auspicious().contains("驿马") && !gods.inauspicious().contains("无禄")) {
                assertThat(result.activities().recommended()).as(date.toString()).doesNotContain("搬移");
                assertThat(result.activities().avoided()).as(date.toString()).contains("搬移"); cases++;
            }
        }
        assertThat(cases).isPositive();
        var virtueCase = service.calculateAt(LocalDate.of(2024, 5, 11).atTime(12, 0).atZone(ZoneOffset.ofHours(8)));
        assertThat(virtueCase.traditionalAlmanac().gods().virtuePresent()).isTrue();
        assertThat(virtueCase.traditionalAlmanac().gods().auspicious()).contains("驿马");
        assertThat(virtueCase.activities().avoided()).contains("搬移");
        assertThat(virtueCase.activities().recommended()).doesNotContain("搬移");
    }
}
