package cn.wannianli.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import cn.wannianli.calendar.SeasonalContext.PeriodStatus;
import cn.wannianli.calendar.SeasonalContext.SolarTermStatus;
import cn.wannianli.calendar.SeasonalContext.ShuJiuStatus;
import cn.wannianli.calendar.SeasonalContext.TermMoment;
import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;

public final class SeasonalCalculator {

    public static final String GB_T_33661 = "GB_T_33661_2017";
    public static final String FU_SOURCE = "YUDING_XINGLI_KAOYUAN_VOLUME_5";
    public static final String SHUJIU_ANCIENT_SOURCE = "SUISHI_GUANGJI_VOLUME_10";
    public static final String SHUJIU_WU_SOURCE = "QINGJIALU_VOLUME_4";

    private final ZoneId zone;

    public SeasonalCalculator(ZoneId zone) {
        this.zone = zone;
    }

    public SeasonalContext calculate(ZonedDateTime now) {
        double longitude = SolarEphemeris.longitudeAt(now.toInstant());
        return new SeasonalContext(
                season(longitude),
                solarTermStatus(now),
                sanFu(now.toLocalDate()),
                shuJiu(now.toLocalDate()));
    }

    private SolarTermStatus solarTermStatus(ZonedDateTime now) {
        List<TermEvent> events = new ArrayList<>(72);
        for (int year = now.getYear() - 1; year <= now.getYear() + 1; year++) {
            for (SolarTerm term : SolarTerm.values()) {
                events.add(new TermEvent(term, SolarEphemeris.solarTermInstant(year, term, zone)));
            }
        }
        events.sort(Comparator.comparing(TermEvent::instant));
        TermEvent previous = null;
        TermEvent next = null;
        for (TermEvent event : events) {
            if (!event.instant().isAfter(now.toInstant())) {
                previous = event;
            } else {
                next = event;
                break;
            }
        }
        if (previous == null || next == null) {
            throw new IllegalStateException("Unable to bracket current time with solar terms");
        }
        LocalDate currentDate = now.toLocalDate();
        LocalDate previousDate = previous.instant().atZone(zone).toLocalDate();
        LocalDate nextDate = next.instant().atZone(zone).toLocalDate();
        String todayTerm = currentDate.equals(previousDate)
                ? previous.term().chineseName()
                : currentDate.equals(nextDate) ? next.term().chineseName() : null;
        int dayInPeriod = Math.toIntExact(ChronoUnit.DAYS.between(previousDate, currentDate)) + 1;
        return new SolarTermStatus(
                previous.term().chineseName(),
                todayTerm,
                dayInPeriod,
                ChronoUnit.DAYS.between(currentDate, nextDate),
                moment(previous),
                moment(next),
                GB_T_33661);
    }

    private PeriodStatus sanFu(LocalDate date) {
        LocalDate summerSolstice = termDate(date.getYear(), SolarTerm.SUMMER_SOLSTICE);
        LocalDate startOfAutumn = termDate(date.getYear(), SolarTerm.START_OF_AUTUMN);
        LocalDate earlyFu = nthStemDay(summerSolstice, 6, 3);
        LocalDate middleFu = nthStemDay(summerSolstice, 6, 4);
        LocalDate lateFu = nthStemDay(startOfAutumn, 6, 1);
        LocalDate end = lateFu.plusDays(9);

        if (date.isBefore(earlyFu) || date.isAfter(end)) {
            return new PeriodStatus(false, null, null, null, earlyFu, end,
                    "夏至后第三个庚日起初伏，第四个庚日起中伏，立秋后首个庚日起末伏。", FU_SOURCE);
        }
        if (date.isBefore(middleFu)) {
            return activePeriod("初伏", earlyFu, middleFu.minusDays(1), date, FU_SOURCE);
        }
        if (date.isBefore(lateFu)) {
            return activePeriod("中伏", middleFu, lateFu.minusDays(1), date, FU_SOURCE);
        }
        return activePeriod("末伏", lateFu, end, date, FU_SOURCE);
    }

    private ShuJiuStatus shuJiu(LocalDate date) {
        PeriodStatus ancient = shuJiu(date, 1, "冬至次日起数", SHUJIU_ANCIENT_SOURCE);
        PeriodStatus wuCustom = shuJiu(date, 0, "冬至日起数", SHUJIU_WU_SOURCE);
        return new ShuJiuStatus("冬至次日起数（较早文献口径）", ancient, List.of(ancient, wuCustom),
                "古籍存在两种起数口径，结果并列而不强行混同；现代常见口径多采用冬至日起数。" );
    }

    private PeriodStatus shuJiu(LocalDate date, int startOffset, String convention, String source) {
        LocalDate winterSolstice = termDate(date.getYear(), SolarTerm.WINTER_SOLSTICE);
        if (date.isBefore(winterSolstice)) {
            winterSolstice = termDate(date.getYear() - 1, SolarTerm.WINTER_SOLSTICE);
        }
        LocalDate start = winterSolstice.plusDays(startOffset);
        LocalDate end = start.plusDays(80);
        if (date.isBefore(start) || date.isAfter(end)) {
            LocalDate next = termDate(date.getYear(), SolarTerm.WINTER_SOLSTICE);
            if (!date.isBefore(next)) {
                next = termDate(date.getYear() + 1, SolarTerm.WINTER_SOLSTICE);
            }
            LocalDate nextStart = next.plusDays(startOffset);
            return new PeriodStatus(false, null, null, null, nextStart, nextStart.plusDays(80),
                    convention + "，每九日为一九，共九九八十一日。", source);
        }
        int overallDay = Math.toIntExact(ChronoUnit.DAYS.between(start, date)) + 1;
        int nine = (overallDay - 1) / 9 + 1;
        int dayInNine = (overallDay - 1) % 9 + 1;
        String name = "一二三四五六七八九".substring(nine - 1, nine) + "九";
        return new PeriodStatus(true, name, dayInNine, 9,
                start.plusDays((long) (nine - 1) * 9),
                start.plusDays((long) nine * 9 - 1),
                convention + "：" + name + "第" + dayInNine + "天（数九总第" + overallDay + "天）", source);
    }

    private PeriodStatus activePeriod(String name, LocalDate start, LocalDate end, LocalDate date, String source) {
        int dayIndex = Math.toIntExact(ChronoUnit.DAYS.between(start, date)) + 1;
        int total = Math.toIntExact(ChronoUnit.DAYS.between(start, end)) + 1;
        return new PeriodStatus(true, name, dayIndex, total, start, end,
                name + "第" + dayIndex + "天，共" + total + "天", source);
    }

    private LocalDate nthStemDay(LocalDate start, int stemIndex, int occurrence) {
        LocalDate cursor = start;
        int found = 0;
        while (true) {
            if (SexagenaryCycle.day(cursor).stemIndex() == stemIndex) {
                found++;
                if (found == occurrence) {
                    return cursor;
                }
            }
            cursor = cursor.plusDays(1);
        }
    }

    private LocalDate termDate(int year, SolarTerm term) {
        return SolarEphemeris.solarTermInstant(year, term, zone).atZone(zone).toLocalDate();
    }

    private String season(double longitude) {
        if (inArc(longitude, 315, 45)) {
            return "春季";
        }
        if (inArc(longitude, 45, 135)) {
            return "夏季";
        }
        if (inArc(longitude, 135, 225)) {
            return "秋季";
        }
        return "冬季";
    }

    private boolean inArc(double longitude, double start, double end) {
        return start < end
                ? longitude >= start && longitude < end
                : longitude >= start || longitude < end;
    }

    private TermMoment moment(TermEvent event) {
        return new TermMoment(event.term().chineseName(), event.instant().atZone(zone));
    }

    private record TermEvent(SolarTerm term, Instant instant) {
    }
}
