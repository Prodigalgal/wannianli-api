package cn.wannianli.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import cn.wannianli.calendar.SeasonalContext;

public record CurrentAlmanacResponse(
        ZonedDateTime currentTime,
        GregorianDate gregorian,
        LunarDate lunar,
        FourPillars fourPillars,
        String zodiac,
        String season,
        SolarTerm solarTerm,
        Period sanFu,
        ShuJiu shuJiu,
        DayOfficer dayOfficer,
        DutyGod dutyGod,
        List<String> auspiciousGods,
        List<String> inauspiciousGods,
        PengZuTaboo pengZuTaboo,
        Clash clash,
        String fetalGod,
        Mansion mansion,
        Activities activities) {

    public CurrentAlmanacResponse {
        auspiciousGods = List.copyOf(auspiciousGods);
        inauspiciousGods = List.copyOf(inauspiciousGods);
    }

    public static CurrentAlmanacResponse from(AlmanacResponse source) {
        var seasonal = source.seasonal();
        var traditional = source.traditionalAlmanac();
        var activityResult = source.activities();

        return new CurrentAlmanacResponse(
                source.currentTime(),
                GregorianDate.from(source.gregorian()),
                LunarDate.from(source.lunar()),
                FourPillars.from(source.fourPillars()),
                source.zodiac(),
                seasonal.season(),
                SolarTerm.from(seasonal.solarTerm()),
                Period.from(seasonal.sanFu()),
                ShuJiu.from(seasonal.shuJiu()),
                new DayOfficer(traditional.dayOfficer().name(), traditional.dayOfficer().generalNature()),
                new DutyGod(traditional.dutyGod().name(), traditional.dutyGod().path(),
                        traditional.dutyGod().luck()),
                traditional.gods().auspicious(),
                traditional.gods().inauspicious(),
                new PengZuTaboo(traditional.pengZu().heavenlyStemRule(),
                        traditional.pengZu().earthlyBranchRule()),
                new Clash(traditional.clash().opposingPillar(), traditional.clash().zodiac(),
                        traditional.clash().direction(), traditional.clash().description()),
                traditional.fetalGod().position(),
                new Mansion(traditional.mansion().name(), traditional.mansion().fullName(),
                        traditional.mansion().luck(), traditional.mansion().palace(),
                        traditional.mansion().guardian()),
                new Activities(activityResult.recommended(), activityResult.avoided(), activityResult.caution(),
                        activityResult.dayGrade().classicalName(), activityResult.virtuePresent(),
                        activityResult.allActivitiesAvoided()));
    }

    public record GregorianDate(
            LocalDate date,
            int year,
            int month,
            int day,
            String weekday,
            long julianDayNumber) {

        private static GregorianDate from(AlmanacResponse.GregorianDate source) {
            return new GregorianDate(source.date(), source.year(), source.month(), source.day(),
                    source.weekday(), source.julianDayNumber());
        }
    }

    public record LunarDate(
            int year,
            int month,
            int day,
            boolean leapMonth,
            int daysInMonth,
            String display,
            LocalDate monthStartDate,
            Instant astronomicalNewMoon) {

        private static LunarDate from(AlmanacResponse.LunarDate source) {
            return new LunarDate(source.year(), source.month(), source.day(), source.leapMonth(),
                    source.daysInMonth(), source.display(), source.monthStartDate(),
                    source.astronomicalNewMoon());
        }
    }

    public record FourPillars(Pillar year, Pillar month, Pillar day, Pillar hour) {

        private static FourPillars from(AlmanacResponse.FourPillars source) {
            return new FourPillars(Pillar.from(source.year()), Pillar.from(source.month()),
                    Pillar.from(source.day()), Pillar.from(source.hour()));
        }
    }

    public record Pillar(
            String value,
            String heavenlyStem,
            String earthlyBranch,
            String zodiac,
            String naYin) {

        private static Pillar from(AlmanacResponse.Pillar source) {
            return new Pillar(source.value(), source.heavenlyStem(), source.earthlyBranch(),
                    source.zodiac(), source.naYin());
        }
    }

    public record SolarTerm(
            String currentPeriod,
            String todayTerm,
            int dayInPeriod,
            long daysUntilNext,
            TermMoment previous,
            TermMoment next) {

        private static SolarTerm from(SeasonalContext.SolarTermStatus source) {
            return new SolarTerm(source.currentPeriod(), source.todayTerm(), source.dayInPeriod(),
                    source.daysUntilNext(), TermMoment.from(source.previous()), TermMoment.from(source.next()));
        }
    }

    public record TermMoment(String name, ZonedDateTime at) {

        private static TermMoment from(SeasonalContext.TermMoment source) {
            return new TermMoment(source.name(), source.at());
        }
    }

    public record Period(
            boolean active,
            String name,
            Integer dayIndex,
            Integer totalDays,
            LocalDate startDate,
            LocalDate endDate,
            String description) {

        private static Period from(SeasonalContext.PeriodStatus source) {
            return new Period(source.active(), source.name(), source.dayIndex(), source.totalDays(),
                    source.startDate(), source.endDate(), source.description());
        }
    }

    public record ShuJiu(String primaryConvention, Period primary, List<Period> variants) {

        public ShuJiu {
            variants = List.copyOf(variants);
        }

        private static ShuJiu from(SeasonalContext.ShuJiuStatus source) {
            return new ShuJiu(source.primaryConvention(), Period.from(source.primary()),
                    source.variants().stream().map(Period::from).toList());
        }
    }

    public record DayOfficer(String name, String generalNature) {
    }

    public record DutyGod(String name, String path, String luck) {
    }

    public record PengZuTaboo(String heavenlyStemRule, String earthlyBranchRule) {
    }

    public record Clash(String opposingPillar, String zodiac, String direction, String description) {
    }

    public record Mansion(String name, String fullName, String luck, String palace, String guardian) {
    }

    public record Activities(
            List<String> recommended,
            List<String> avoided,
            List<String> caution,
            String dayGrade,
            boolean virtuePresent,
            boolean allActivitiesAvoided) {

        public Activities {
            recommended = List.copyOf(recommended);
            avoided = List.copyOf(avoided);
            caution = List.copyOf(caution);
        }
    }
}
