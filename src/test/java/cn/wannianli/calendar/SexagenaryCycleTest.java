package cn.wannianli.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;

class SexagenaryCycleTest {

    private static final ZoneId UTC_PLUS_8 = ZoneOffset.ofHours(8);

    @Test
    void derivesPillarsWithoutAReferenceCalendarLibrary() {
        var time = LocalDate.of(2026, 8, 3).atTime(12, 0).atZone(UTC_PLUS_8);
        var startOfSpring = SolarEphemeris.solarTermInstant(2026, SolarTerm.START_OF_SPRING, UTC_PLUS_8);
        var year = SexagenaryCycle.year(time, startOfSpring);
        var month = SexagenaryCycle.month(year, SolarEphemeris.longitudeAt(time.toInstant()));
        var day = SexagenaryCycle.day(time.toLocalDate());
        var hour = SexagenaryCycle.hour(day, time.getHour());

        assertThat(year.name()).isEqualTo("丙午");
        assertThat(month.name()).isEqualTo("乙未");
        assertThat(day.name()).isEqualTo("己酉");
        assertThat(hour.name()).isEqualTo("庚午");
        assertThat(year.zodiac()).isEqualTo("马");
    }

    @Test
    void knownJiaZiEpochIsStable() {
        assertThat(SexagenaryCycle.day(LocalDate.of(2000, 1, 7)).name()).isEqualTo("甲子");
    }

    @Test
    void calculatesAllSixXunKongGroupsAcrossTheWholeCycle() {
        var expected = List.of(
                new ExpectedXunKong("甲子旬", List.of("戌", "亥")),
                new ExpectedXunKong("甲戌旬", List.of("申", "酉")),
                new ExpectedXunKong("甲申旬", List.of("午", "未")),
                new ExpectedXunKong("甲午旬", List.of("辰", "巳")),
                new ExpectedXunKong("甲辰旬", List.of("寅", "卯")),
                new ExpectedXunKong("甲寅旬", List.of("子", "丑")));

        for (int index = 0; index < 60; index++) {
            var actual = SexagenaryCycle.xunKong(SexagenaryCycle.fromIndex(index));
            var group = expected.get(index / 10);
            assertThat(actual.xunName()).as("干支索引 %s 所属旬", index).isEqualTo(group.xunName());
            assertThat(actual.emptyBranches()).as("干支索引 %s 旬空", index)
                    .containsExactlyElementsOf(group.emptyBranches());
        }
    }

    private record ExpectedXunKong(String xunName, List<String> emptyBranches) {
    }
}
