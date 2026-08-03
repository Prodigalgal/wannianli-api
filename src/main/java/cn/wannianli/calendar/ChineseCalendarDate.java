package cn.wannianli.calendar;

import java.time.Instant;
import java.time.LocalDate;

public record ChineseCalendarDate(
        int year,
        int month,
        int day,
        boolean leapMonth,
        int daysInMonth,
        LocalDate monthStartDate,
        Instant astronomicalNewMoon,
        String display) {
}
