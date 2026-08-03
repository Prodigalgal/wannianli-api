package cn.wannianli.calendar;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;

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
}
