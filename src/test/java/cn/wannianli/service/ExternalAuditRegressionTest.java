package cn.wannianli.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import cn.wannianli.calendar.SeasonalCalculator;
import cn.wannianli.calendar.astronomy.DeltaT;
import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;
import cn.wannianli.rules.ClassicalGods;
import cn.wannianli.rules.ActivityResult.Disposition;

class ExternalAuditRegressionTest {
    private static final ZoneOffset ZONE = ZoneOffset.ofHours(8);
    private final AlmanacService service = new AlmanacService(Clock.systemUTC());

    @Test
    void everyMonthBreakTabooRemainsAvoidedAcross2020Through2030() {
        int brokenDays = 0;
        int virtueDays = 0;
        for (LocalDate date = LocalDate.of(2020, 1, 1); date.isBefore(LocalDate.of(2031, 1, 1)); date = date.plusDays(1)) {
            var value = service.calculateAt(date.atTime(12, 0).atZone(ZONE));
            var rule = value.activities().ruleHits().stream().filter(hit -> hit.ruleId().equals("OFFICER_破")).findFirst();
            if (rule.isEmpty()) continue;
            brokenDays++;
            if (value.activities().virtuePresent()) virtueDays++;
            assertThat(value.activities().recommended()).doesNotContainAnyElementsOf(rule.get().avoids());
            for (String activity : rule.get().avoids()) {
                var decision = value.activities().decisions().stream().filter(d -> d.activity().equals(activity)).findFirst().orElseThrow();
                assertThat(decision.avoidedBy()).contains("OFFICER_破");
                if (value.traditionalAlmanac().gods().inauspicious().contains("无禄") && !ClassicalGods.noSalaryAllowed().contains(activity)) {
                    assertThat(decision.disposition()).isEqualTo(Disposition.OMITTED);
                } else assertThat(value.activities().avoided()).contains(activity);
            }
        }
        assertThat(brokenDays).isEqualTo(333);
        assertThat(virtueDays).isEqualTo(89);
    }

    @Test
    void earthReignAddsMaternalStorehouseAndRetainsEarthworkTaboosAtBothEndsOfEachPeriod() {
        for (var term : List.of(SolarTerm.START_OF_SPRING, SolarTerm.START_OF_SUMMER,
                SolarTerm.START_OF_AUTUMN, SolarTerm.START_OF_WINTER)) {
            LocalDate end = SolarEphemeris.solarTermInstant(2026, term, ZONE).atZone(ZONE).toLocalDate();
            assertThat(SeasonalCalculator.isEarthReign(end.minusDays(19), ZONE)).isFalse();
            assertThat(SeasonalCalculator.isEarthReign(end, ZONE)).isFalse();
            for (LocalDate date = end.minusDays(18); date.isBefore(end); date = date.plusDays(1)) {
                assertThat(SeasonalCalculator.isEarthReign(date, ZONE)).isTrue();
                var value = service.calculateAt(date.atTime(12, 0).atZone(ZONE));
                assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("土王用事");
                if (List.of("巳", "午").contains(value.fourPillars().day().earthlyBranch())) {
                    assertThat(value.traditionalAlmanac().gods().auspicious()).contains("母仓");
                }
                assertThat(value.activities().recommended()).doesNotContain("兴造动土", "塞穴");
            }
        }
    }

    @Test
    void civilDaySixteenCanCoexistWithTheNextTermLaterToday() {
        var value = service.calculateAt(LocalDate.of(2026, 8, 7).atTime(12, 0).atZone(ZONE));
        assertThat(value.seasonal().solarTerm().currentPeriod()).isEqualTo("大暑");
        assertThat(value.seasonal().solarTerm().todayTerm()).isEqualTo("立秋");
        assertThat(value.seasonal().solarTerm().dayInPeriod()).isEqualTo(16);
        assertThat(value.seasonal().solarTerm().daysUntilNext()).isZero();
    }

    @Test
    void observedDeltaTAnchorsAndInternalAstronomyGuardsRemainExplicit() {
        assertThat(DeltaT.seconds(2024)).isEqualTo(69.1752);
        assertThat(DeltaT.seconds(2025)).isEqualTo(69.1377);
        assertThat(DeltaT.seconds(2026)).isEqualTo(69.1099);
        assertThat(DeltaT.seconds(2201.1)).isFinite();
        assertThatThrownBy(() -> DeltaT.seconds(Double.NaN)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> DeltaT.seconds(2202.1)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SolarEphemeris.solarTermInstant(1799, SolarTerm.WINTER_SOLSTICE, ZONE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> SolarEphemeris.solarTermInstant(2201, SolarTerm.WINTER_SOLSTICE, ZONE))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
