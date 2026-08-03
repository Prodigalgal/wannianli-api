package cn.wannianli.rules;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import cn.wannianli.almanac.TraditionalAlmanacCalculator;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.rules.ActivityResult.Disposition;

class ActivityRuleEngineTest {

    @Test
    void lowerAuthorityPengZuTabooCannotOverrideImperialCanonRule() {
        var month = SexagenaryCycle.fromIndex(4); // 戊辰月
        var day = SexagenaryCycle.fromIndex(2);   // 丙寅日 -> 开日
        var almanac = new TraditionalAlmanacCalculator()
                .calculate(LocalDate.of(2026, 4, 1), month, day, 20);

        var result = new ActivityRuleEngine()
                .evaluate(LocalDate.of(2026, 4, 1), month, day, almanac);

        assertThat(result.decisions())
                .filteredOn(decision -> decision.activity().equals("祭祀"))
                .singleElement()
                .satisfies(decision -> {
                    assertThat(decision.disposition()).isEqualTo(Disposition.RECOMMENDED);
                    assertThat(decision.excludedLowerAuthorityRules()).contains("PENGZU_BRANCH_丙寅");
                });
    }

    @Test
    void everyReturnedActivityCanBeTracedToAtLeastOneRule() {
        var month = SexagenaryCycle.fromIndex(43); // 丁未
        var day = SexagenaryCycle.fromIndex(45);   // 己酉
        var almanac = new TraditionalAlmanacCalculator()
                .calculate(LocalDate.of(2026, 8, 3), month, day, 120);

        var result = new ActivityRuleEngine()
                .evaluate(LocalDate.of(2026, 8, 3), month, day, almanac);

        assertThat(result.decisions()).allSatisfy(decision ->
                assertThat(decision.recommendedBy().isEmpty() && decision.avoidedBy().isEmpty()).isFalse());
    }
}
