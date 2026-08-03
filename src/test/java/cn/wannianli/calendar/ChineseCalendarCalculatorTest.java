package cn.wannianli.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;

class ChineseCalendarCalculatorTest {

    private static final ZoneId UTC_PLUS_8 = ZoneOffset.ofHours(8);
    private final ChineseCalendarCalculator calculator = new ChineseCalendarCalculator(UTC_PLUS_8);

    @Test
    void matchesHongKongObservatoryForAugustThird2026() {
        ChineseCalendarDate result = calculator.calculate(LocalDate.of(2026, 8, 3));

        assertThat(result.year()).isEqualTo(2026);
        assertThat(result.month()).isEqualTo(6);
        assertThat(result.day()).isEqualTo(21);
        assertThat(result.leapMonth()).isFalse();
        assertThat(result.display()).isEqualTo("二〇二六年六月廿一");
    }

    @Test
    void matchesPublishedChineseNewYearDates() {
        assertLunarNewYear(2020, 1, 25);
        assertLunarNewYear(2021, 2, 12);
        assertLunarNewYear(2022, 2, 1);
        assertLunarNewYear(2023, 1, 22);
        assertLunarNewYear(2024, 2, 10);
        assertLunarNewYear(2025, 1, 29);
        assertLunarNewYear(2026, 2, 17);
        assertLunarNewYear(2027, 2, 6);
        assertLunarNewYear(2028, 1, 26);
        assertLunarNewYear(2029, 2, 13);
        assertLunarNewYear(2030, 2, 3);
    }

    @Test
    void matchesHongKongObservatoryLeapFourthMonthIn2020() {
        ChineseCalendarDate regularFourthMonth = calculator.calculate(LocalDate.of(2020, 4, 23));
        ChineseCalendarDate leapFourthMonth = calculator.calculate(LocalDate.of(2020, 5, 23));

        assertThat(regularFourthMonth.month()).isEqualTo(4);
        assertThat(regularFourthMonth.day()).isEqualTo(1);
        assertThat(regularFourthMonth.leapMonth()).isFalse();
        assertThat(leapFourthMonth.month()).isEqualTo(4);
        assertThat(leapFourthMonth.day()).isEqualTo(1);
        assertThat(leapFourthMonth.leapMonth()).isTrue();
    }

    @Test
    void matchesHongKongObservatorySolarTermDatesFor2026() {
        assertThat(localDateOf(SolarTerm.MAJOR_HEAT)).isEqualTo(LocalDate.of(2026, 7, 23));
        assertThat(localDateOf(SolarTerm.START_OF_AUTUMN)).isEqualTo(LocalDate.of(2026, 8, 7));
        assertThat(localDateOf(SolarTerm.END_OF_HEAT)).isEqualTo(LocalDate.of(2026, 8, 23));
    }

    private void assertLunarNewYear(int year, int month, int day) {
        ChineseCalendarDate result = calculator.calculate(LocalDate.of(year, month, day));
        assertThat(result.year()).isEqualTo(year);
        assertThat(result.month()).isEqualTo(1);
        assertThat(result.day()).isEqualTo(1);
        assertThat(result.leapMonth()).isFalse();
    }

    private LocalDate localDateOf(SolarTerm term) {
        return SolarEphemeris.solarTermInstant(2026, term, UTC_PLUS_8).atZone(UTC_PLUS_8).toLocalDate();
    }
}
