package cn.wannianli.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

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

    @Test
    void matchesAll24HongKongObservatorySolarTermDatesFor2026() {
        int[][] expected = {
                {1, 5}, {1, 20}, {2, 4}, {2, 18}, {3, 5}, {3, 20},
                {4, 5}, {4, 20}, {5, 5}, {5, 21}, {6, 5}, {6, 21},
                {7, 7}, {7, 23}, {8, 7}, {8, 23}, {9, 7}, {9, 23},
                {10, 8}, {10, 23}, {11, 7}, {11, 22}, {12, 7}, {12, 22}
        };
        SolarTerm[] terms = SolarTerm.values();
        for (int i = 0; i < terms.length; i++) {
            assertThat(localDateOf(terms[i])).as(terms[i].chineseName())
                    .isEqualTo(LocalDate.of(2026, expected[i][0], expected[i][1]));
        }
    }

    @Test
    void matchesHongKongObservatoryPublishedMinutesForAugust2026() {
        assertThat(roundedLocalMinute(SolarTerm.MAJOR_HEAT)).isEqualTo("2026-07-23T03:13");
        assertThat(roundedLocalMinute(SolarTerm.START_OF_AUTUMN)).isEqualTo("2026-08-07T19:43");
        assertThat(roundedLocalMinute(SolarTerm.END_OF_HEAT)).isEqualTo("2026-08-23T10:19");

        ChineseCalendarDate seventhMonth = calculator.calculate(LocalDate.of(2026, 8, 13));
        assertThat(seventhMonth.astronomicalNewMoon().atZone(UTC_PLUS_8)
                .plusSeconds(30).truncatedTo(ChronoUnit.MINUTES).toLocalDateTime().toString())
                .isEqualTo("2026-08-13T01:37");
    }

    @Test
    void treatsANewMoonLaterOnTheWinterSolsticeCivilDayAsMonthEleven() {
        assertLunarDate(2014, 12, 21, 10, 30, false);
        assertLunarDate(2014, 12, 22, 11, 1, false);
        assertLunarDate(2015, 2, 19, 1, 1, false);
    }

    @Test
    void includesTheTerminalMonthElevenAndSupportsTheAdvertisedUpperYear() {
        assertLunarDate(2026, 12, 9, 11, 1, false);
        assertThat(calculator.calculate(LocalDate.of(2199, 12, 31)).year()).isEqualTo(2199);
    }

    @Test
    void matchesAll365LunarEntriesInTheHongKongObservatory2026Table() {
        List<MonthFixture> months = List.of(
                new MonthFixture(LocalDate.of(2025, 12, 20), 2025, 11),
                new MonthFixture(LocalDate.of(2026, 1, 19), 2025, 12),
                new MonthFixture(LocalDate.of(2026, 2, 17), 2026, 1),
                new MonthFixture(LocalDate.of(2026, 3, 19), 2026, 2),
                new MonthFixture(LocalDate.of(2026, 4, 17), 2026, 3),
                new MonthFixture(LocalDate.of(2026, 5, 17), 2026, 4),
                new MonthFixture(LocalDate.of(2026, 6, 15), 2026, 5),
                new MonthFixture(LocalDate.of(2026, 7, 14), 2026, 6),
                new MonthFixture(LocalDate.of(2026, 8, 13), 2026, 7),
                new MonthFixture(LocalDate.of(2026, 9, 11), 2026, 8),
                new MonthFixture(LocalDate.of(2026, 10, 10), 2026, 9),
                new MonthFixture(LocalDate.of(2026, 11, 9), 2026, 10),
                new MonthFixture(LocalDate.of(2026, 12, 9), 2026, 11));

        for (LocalDate date = LocalDate.of(2026, 1, 1); date.getYear() == 2026; date = date.plusDays(1)) {
            LocalDate candidate = date;
            MonthFixture expected = months.stream().filter(month -> !month.start().isAfter(candidate))
                    .reduce((first, second) -> second).orElseThrow();
            ChineseCalendarDate actual = calculator.calculate(date);
            assertThat(List.of(actual.year(), actual.month(), actual.day(), actual.leapMonth()))
                    .as(date.toString())
                    .containsExactly(expected.lunarYear(), expected.month(),
                            (int) ChronoUnit.DAYS.between(expected.start(), date) + 1, false);
        }
    }

    @Test
    void supportedRangeKeepsLunarDaysAndMonthLengthsContinuous() {
        ChineseCalendarDate previous = null;
        LocalDate previousDate = null;
        for (LocalDate date = LocalDate.of(1801, 1, 1);
             !date.isAfter(LocalDate.of(2199, 12, 31)); date = date.plusDays(1)) {
            ChineseCalendarDate actual = calculator.calculate(date);
            require(actual.month() >= 1 && actual.month() <= 12, date, "month range");
            require(actual.daysInMonth() == 29 || actual.daysInMonth() == 30, date, "month length");
            require(actual.day() >= 1 && actual.day() <= actual.daysInMonth(), date, "day range");
            if (previous != null) {
                if (actual.monthStartDate().equals(previous.monthStartDate())) {
                    require(actual.day() == previous.day() + 1, date, "day continuity");
                    require(actual.month() == previous.month() && actual.leapMonth() == previous.leapMonth()
                            && actual.year() == previous.year(), date, "month identity continuity");
                } else {
                    require(actual.day() == 1, date, "month starts at day one");
                    require(previous.day() == previous.daysInMonth(), previousDate, "declared month end");
                }
            }
            previous = actual;
            previousDate = date;
        }
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

    private String roundedLocalMinute(SolarTerm term) {
        return SolarEphemeris.solarTermInstant(2026, term, UTC_PLUS_8).atZone(UTC_PLUS_8)
                .plusSeconds(30).truncatedTo(ChronoUnit.MINUTES).toLocalDateTime().toString();
    }

    private void assertLunarDate(int year, int month, int day, int lunarMonth, int lunarDay, boolean leap) {
        ChineseCalendarDate result = calculator.calculate(LocalDate.of(year, month, day));
        assertThat(result.month()).isEqualTo(lunarMonth);
        assertThat(result.day()).isEqualTo(lunarDay);
        assertThat(result.leapMonth()).isEqualTo(leap);
    }

    private record MonthFixture(LocalDate start, int lunarYear, int month) {
    }

    private void require(boolean condition, LocalDate date, String invariant) {
        if (!condition) {
            throw new AssertionError(date + ": " + invariant);
        }
    }
}
