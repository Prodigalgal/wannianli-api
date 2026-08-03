package cn.wannianli.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import cn.wannianli.calendar.astronomy.NewMoonEphemeris;
import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;

public final class ChineseCalendarCalculator {

    private static final String[] MONTH_NAMES = {
            "", "正月", "二月", "三月", "四月", "五月", "六月",
            "七月", "八月", "九月", "十月", "冬月", "腊月"
    };
    private static final String[] DAY_NAMES = {
            "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
            "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
            "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"
    };

    private final ZoneId zone;

    public ChineseCalendarCalculator(ZoneId zone) {
        this.zone = zone;
    }

    public ChineseCalendarDate calculate(LocalDate date) {
        if (date.getYear() < 1801 || date.getYear() > 2199) {
            throw new IllegalArgumentException("Chinese calendar calculation supports years 1801 through 2199");
        }

        Instant reference = date.atTime(12, 0).atZone(zone).toInstant();
        Instant winterSolsticeThisYear = SolarEphemeris.solarTermInstant(
                date.getYear(), SolarTerm.WINTER_SOLSTICE, zone);
        int firstSolsticeYear = date.isBefore(winterSolsticeThisYear.atZone(zone).toLocalDate())
                ? date.getYear() - 1
                : date.getYear();
        Instant firstSolstice = SolarEphemeris.solarTermInstant(
                firstSolsticeYear, SolarTerm.WINTER_SOLSTICE, zone);
        Instant secondSolstice = SolarEphemeris.solarTermInstant(
                firstSolsticeYear + 1, SolarTerm.WINTER_SOLSTICE, zone);

        int firstMonth11Lunation = NewMoonEphemeris.lunationAtOrBefore(firstSolstice);
        int secondMonth11Lunation = NewMoonEphemeris.lunationAtOrBefore(secondSolstice);
        int monthCount = secondMonth11Lunation - firstMonth11Lunation;
        if (monthCount != 12 && monthCount != 13) {
            throw new IllegalStateException("Astronomical month sequence is invalid: " + monthCount);
        }

        int leapIndex = monthCount == 13
                ? findLeapMonthIndex(firstMonth11Lunation, monthCount)
                : -1;
        List<MonthSpan> spans = buildMonthSpans(firstMonth11Lunation, monthCount, leapIndex);
        int newYearIndex = findNewYearIndex(spans);
        int lunarYear = spans.get(newYearIndex).startDate().getYear();

        for (int i = 0; i < spans.size(); i++) {
            MonthSpan span = spans.get(i);
            if (!date.isBefore(span.startDate()) && date.isBefore(span.endDate())) {
                int year = i < newYearIndex ? lunarYear - 1 : lunarYear;
                int day = Math.toIntExact(ChronoUnit.DAYS.between(span.startDate(), date)) + 1;
                int length = Math.toIntExact(ChronoUnit.DAYS.between(span.startDate(), span.endDate()));
                String display = chineseYear(year) + "年"
                        + (span.leap() ? "闰" : "") + MONTH_NAMES[span.month()] + DAY_NAMES[day];
                return new ChineseCalendarDate(year, span.month(), day, span.leap(), length,
                        span.startDate(), span.newMoon(), display);
            }
        }
        throw new IllegalStateException("Date did not fall within calculated lunisolar year: " + reference);
    }

    private int findLeapMonthIndex(int firstLunation, int monthCount) {
        for (int i = 1; i < monthCount; i++) {
            Instant start = NewMoonEphemeris.newMoonInstant(firstLunation + i);
            Instant end = NewMoonEphemeris.newMoonInstant(firstLunation + i + 1);
            if (!containsMajorSolarTerm(start, end)) {
                return i;
            }
        }
        throw new IllegalStateException("Thirteen lunar months found without a leap-month candidate");
    }

    private boolean containsMajorSolarTerm(Instant start, Instant end) {
        LocalDate startDate = start.atZone(zone).toLocalDate();
        LocalDate endDate = end.atZone(zone).toLocalDate();
        for (int year = startDate.getYear() - 1; year <= endDate.getYear() + 1; year++) {
            for (SolarTerm term : SolarTerm.values()) {
                if (Math.floorMod((int) term.longitude(), 30) != 0) {
                    continue;
                }
                LocalDate termDate = SolarEphemeris.solarTermInstant(year, term, zone)
                        .atZone(zone)
                        .toLocalDate();
                if (!termDate.isBefore(startDate) && termDate.isBefore(endDate)) {
                    return true;
                }
            }
        }
        return false;
    }

    private List<MonthSpan> buildMonthSpans(int firstLunation, int monthCount, int leapIndex) {
        List<MonthSpan> spans = new ArrayList<>(monthCount);
        int month = 11;
        for (int i = 0; i < monthCount; i++) {
            boolean leap = i == leapIndex;
            if (i > 0 && !leap) {
                month = month % 12 + 1;
            }
            Instant start = NewMoonEphemeris.newMoonInstant(firstLunation + i);
            Instant end = NewMoonEphemeris.newMoonInstant(firstLunation + i + 1);
            spans.add(new MonthSpan(month, leap, start, start.atZone(zone).toLocalDate(),
                    end.atZone(zone).toLocalDate()));
        }
        return List.copyOf(spans);
    }

    private int findNewYearIndex(List<MonthSpan> spans) {
        for (int i = 0; i < spans.size(); i++) {
            if (spans.get(i).month() == 1 && !spans.get(i).leap()) {
                return i;
            }
        }
        throw new IllegalStateException("Lunar new year was not found in month sequence");
    }

    private static String chineseYear(int year) {
        String digits = "〇一二三四五六七八九";
        String value = Integer.toString(year);
        StringBuilder result = new StringBuilder(value.length());
        for (int i = 0; i < value.length(); i++) {
            result.append(digits.charAt(value.charAt(i) - '0'));
        }
        return result.toString();
    }

    private record MonthSpan(
            int month,
            boolean leap,
            Instant newMoon,
            LocalDate startDate,
            LocalDate endDate) {
    }
}
