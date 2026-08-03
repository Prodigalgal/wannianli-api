package cn.wannianli.almanac;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;

import cn.wannianli.calendar.SexagenaryCycle;

class TraditionalAlmanacCalculatorTest {

    private final TraditionalAlmanacCalculator calculator = new TraditionalAlmanacCalculator();

    @Test
    void currentDayUsesTheCorrectedVolumeFiveGodRules() {
        var result = calculator.calculate(LocalDate.of(2026, 8, 3),
                SexagenaryCycle.fromIndex(43), SexagenaryCycle.fromIndex(45), 130);

        assertThat(result.gods().auspicious())
                .containsExactly("月德合", "天德合", "天恩", "四相", "民日", "天巫", "福德");
        assertThat(result.gods().inauspicious()).containsExactly("灾煞", "天火");
        assertThat(result.gods().virtuePresent()).isTrue();
    }

    @Test
    void heavenlyVirtueUsesBranchesInTheFourMiddleMonths() {
        var secondMonth = calculator.calculate(LocalDate.of(2026, 3, 1),
                SexagenaryCycle.fromIndex(3), SexagenaryCycle.fromIndex(8), 350);

        assertThat(secondMonth.gods().auspicious()).contains("天德");
    }

    @Test
    void heavenlyDogOccursOnlyOnTheXuFullDayOfTheShenMonth() {
        var shenMonthXuDay = calculator.calculate(LocalDate.of(2026, 8, 1),
                SexagenaryCycle.fromIndex(8), SexagenaryCycle.fromIndex(10), 140);
        var weiMonthYouDay = calculator.calculate(LocalDate.of(2026, 8, 3),
                SexagenaryCycle.fromIndex(43), SexagenaryCycle.fromIndex(45), 130);

        assertThat(shenMonthXuDay.dayOfficer().name()).isEqualTo("满");
        assertThat(shenMonthXuDay.gods().inauspicious()).contains("天狗");
        assertThat(weiMonthYouDay.dayOfficer().name()).isEqualTo("满");
        assertThat(weiMonthYouDay.gods().inauspicious()).doesNotContain("天狗");
    }

    @Test
    void keepsRoyalAndOfficialDaysInThePositionsConfirmedAgainByVolumeTen() {
        var springRoyal = calculator.calculate(LocalDate.of(2026, 2, 1),
                SexagenaryCycle.fromIndex(2), SexagenaryCycle.fromIndex(2), 320);
        var springOfficial = calculator.calculate(LocalDate.of(2026, 2, 2),
                SexagenaryCycle.fromIndex(2), SexagenaryCycle.fromIndex(3), 320);

        assertThat(springRoyal.gods().auspicious()).contains("王日").doesNotContain("官日");
        assertThat(springOfficial.gods().auspicious()).contains("官日").doesNotContain("王日");
    }
}
