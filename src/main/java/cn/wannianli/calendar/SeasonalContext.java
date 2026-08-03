package cn.wannianli.calendar;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

public record SeasonalContext(
        String season,
        SolarTermStatus solarTerm,
        PeriodStatus sanFu,
        ShuJiuStatus shuJiu) {

    public record SolarTermStatus(
            String currentPeriod,
            String todayTerm,
            int dayInPeriod,
            long daysUntilNext,
            TermMoment previous,
            TermMoment next,
            String sourceId) {
    }

    public record TermMoment(String name, ZonedDateTime at) {
    }

    public record PeriodStatus(
            boolean active,
            String name,
            Integer dayIndex,
            Integer totalDays,
            LocalDate startDate,
            LocalDate endDate,
            String description,
            String sourceId) {
    }

    public record ShuJiuStatus(
            String primaryConvention,
            PeriodStatus primary,
            List<PeriodStatus> variants,
            String note) {
        public ShuJiuStatus {
            variants = List.copyOf(variants);
        }
    }
}
