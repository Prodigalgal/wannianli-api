package cn.wannianli.service;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import java.util.List;
import org.junit.jupiter.api.Test;
import cn.wannianli.calendar.astronomy.*;
import cn.wannianli.rules.ActivityResult.Disposition;
import tools.jackson.databind.json.JsonMapper;

class SecondAuditRegressionTest {
    private final AlmanacService service = new AlmanacService(Clock.fixed(Instant.parse("2026-08-03T04:00:00Z"), ZoneOffset.ofHours(8)));
    private cn.wannianli.api.AlmanacResponse at(String date) {
        return service.calculateAt(ZonedDateTime.parse(date + "T12:00:00+08:00"));
    }

    @Test
    void openDayBurialPlacementDoesNotTurnIntoRecommendations() {
        int checked = 0;
        for (var date=LocalDate.of(2020,1,1); date.isBefore(LocalDate.of(2025,1,1)); date=date.plusDays(1)) {
            var response=at(date.toString());
            if (!response.traditionalAlmanac().dayOfficer().name().equals("开")) continue;
            assertThat(response.activities().recommended()).doesNotContain("破土", "安葬", "启攒");
            for (String activity : List.of("破土", "安葬", "启攒")) {
                var decision=response.activities().decisions().stream().filter(d->d.activity().equals(activity)).findFirst().orElseThrow();
                if (decision.avoidedBy().stream().noneMatch(id->!id.equals("OFFICER_开")))
                    assertThat(decision.disposition()).isEqualTo(Disposition.OMITTED);
            }
            checked++;
        }
        assertThat(checked).isGreaterThan(100);
        assertThat(at("2020-02-02").activities().recommended()).doesNotContain("安葬");
        assertThat(at("2020-02-02").activities().avoided()).doesNotContain("安葬");
        assertThat(at("2020-11-07").activities().avoided()).doesNotContain("鼓铸");
    }

    @Test
    void monthlyGoldenCasesAndExplicitFullDayReliefAreApplied() {
        String[][] cases = {{"2020-02-14", "上"}, {"2020-02-15", "上次"}, {"2020-08-12", "中"},
                {"2020-02-08", "中次"}, {"2020-03-10", "下"}, {"2020-03-11", "上"}};
        for (var example : cases) assertThat(at(example[0]).activities().dayGrade().classicalName()).as(example[0]).isEqualTo(example[1]);
        var full = at("2020-02-19").activities();
        assertThat(full.recommended()).contains("上官赴任");
        assertThat(full.caution()).doesNotContain("求医");
        assertThat(full.decisions()).filteredOn(d -> d.activity().equals("求医")).singleElement()
                .satisfies(d -> assertThat(d.avoidedBy()).contains("OFFICER_满"));
        assertThat(at("2020-02-14").activities().avoided()).contains("求医");
    }

    @Test
    void fromAvoidExceptionAndTravelPlacementAreNotLostToBeneficRelief() {
        // January 4 is lunar day 23; isolate the from-avoid clause on a different date.
        var level = at("2024-01-17").activities();
        assertThat(level.dayGrade().classicalName()).isEqualTo("下");
        assertThat(level.avoided()).contains("安床", "经络", "开仓库", "出货财");
        var travel = at("2024-04-23").activities();
        assertThat(travel.avoided()).contains("远行");
        assertThat(travel.recommended()).doesNotContain("遣使", "出师");
        assertThat(travel.decisions()).filteredOn(d -> d.activity().equals("遣使")).singleElement()
                .satisfies(d -> assertThat(d.disposition()).isEqualTo(Disposition.OMITTED));
        var withGoingLoss = at("2024-03-06");
        assertThat(withGoingLoss.traditionalAlmanac().gods().inauspicious()).contains("往亡");
        assertThat(withGoingLoss.activities().decisions()).filteredOn(d -> d.activity().equals("遣使")).singleElement()
                .satisfies(d -> assertThat(d.disposition()).isEqualTo(Disposition.AVOID));
        var restricted = at("2024-01-18");
        assertThat(restricted.traditionalAlmanac().gods().inauspicious()).contains("无禄");
        assertThat(restricted.activities().decisions()).filteredOn(d -> d.activity().equals("远行")).singleElement()
                .satisfies(d -> { assertThat(d.avoidedBy()).contains("DAY_SI_RETAINED_TABOOS"); assertThat(d.disposition()).isEqualTo(Disposition.OMITTED); });
    }

    @Test
    void allDayStemAndBranchPlacementPairsHoldAcrossAYear() {
        for (var day = LocalDate.of(2024, 1, 1); day.isBefore(LocalDate.of(2025, 1, 1)); day = day.plusDays(1)) {
            var response = at(day.toString());
            String branch = response.fourPillars().day().earthlyBranch();
            var prohibited = switch (branch) {
                case "寅" -> List.of("祈福", "求嗣");
                case "卯" -> List.of("开渠");
                case "巳" -> List.of("出师", "遣使");
                default -> List.<String>of();
            };
            if (!prohibited.isEmpty()) assertThat(response.activities().recommended()).doesNotContainAnyElementsOf(prohibited);
            if (response.fourPillars().day().heavenlyStem().equals("丁")) assertThat(response.activities().recommended()).doesNotContain("整容");
            if (response.fourPillars().day().heavenlyStem().equals("壬")) assertThat(response.activities().recommended()).doesNotContain("穿井");
        }
    }

    @Test
    void sensitiveAstronomicalEventsAndIndependentJplComparisonStayWithinTheReviewedBoundary() throws Exception {
        var json = JsonMapper.builder().build();
        try (var input = getClass().getResourceAsStream("/fixtures/sensitive-events.json")) {
            for (var event : json.readTree(input).path("events")) {
                var instant = event.path("kind").asString().equals("newMoon")
                        ? NewMoonEphemeris.newMoonInstant(event.path("k").asInt())
                        : SolarEphemeris.solarTermInstant(event.path("year").asInt(), SolarTerm.valueOf(event.path("term").asString()), ZoneOffset.ofHours(8));
                assertThat(instant).isEqualTo(Instant.parse(event.path("instant").asString()));
            }
        }
        try (var input = getClass().getResourceAsStream("/fixtures/jpl-1912-small-snow.json")) {
            var jpl = Instant.parse(json.readTree(input).path("interpolatedCrossing").asString());
            var instant = SolarEphemeris.solarTermInstant(1912, SolarTerm.MINOR_SNOW, ZoneOffset.ofHours(8));
            assertThat(Math.abs(Duration.between(jpl, instant).toMillis())).isLessThan(6000);
        }
        assertThat(DeltaT.MAX_YEAR).isGreaterThanOrEqualTo(SolarEphemeris.MAX_YEAR + 2);
    }
}
