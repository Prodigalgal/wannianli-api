package cn.wannianli.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;

import org.junit.jupiter.api.Test;

class SeasonalCalculatorTest {

    private static final ZoneId UTC_PLUS_8 = ZoneOffset.ofHours(8);
    private final SeasonalCalculator calculator = new SeasonalCalculator(UTC_PLUS_8);

    @Test
    void winterSolsticeDayKeepsTomorrowAsTheAncientConventionStart() {
        var result = calculator.calculate(ZonedDateTime.of(2026, 12, 22, 12, 0, 0, 0, UTC_PLUS_8));

        assertThat(result.shuJiu().primary().active()).isFalse();
        assertThat(result.shuJiu().primary().startDate().toString()).isEqualTo("2026-12-23");
        assertThat(result.shuJiu().variants().get(1).active()).isTrue();
        assertThat(result.shuJiu().variants().get(1).name()).isEqualTo("一九");
        assertThat(result.shuJiu().variants().get(1).dayIndex()).isEqualTo(1);
    }
}
