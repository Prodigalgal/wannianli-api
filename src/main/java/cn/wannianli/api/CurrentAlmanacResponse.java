package cn.wannianli.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import cn.wannianli.calendar.SeasonalContext;

public record CurrentAlmanacResponse(
        @JsonProperty("当前时间") ZonedDateTime currentTime,
        @JsonProperty("公历") GregorianDate gregorian,
        @JsonProperty("农历") LunarDate lunar,
        @JsonProperty("四柱") FourPillars fourPillars,
        @JsonProperty("旬空") FourPillarXunKong xunKong,
        @JsonProperty("生肖") String zodiac,
        @JsonProperty("季节") String season,
        @JsonProperty("节气") SolarTerm solarTerm,
        @JsonProperty("三伏") Period sanFu,
        @JsonProperty("数九") ShuJiu shuJiu,
        @JsonProperty("建除十二神") DayOfficer dayOfficer,
        @JsonProperty("黄黑道十二值神") DutyGod dutyGod,
        @JsonProperty("吉神") List<String> auspiciousGods,
        @JsonProperty("凶煞") List<String> inauspiciousGods,
        @JsonProperty("彭祖百忌") PengZuTaboo pengZuTaboo,
        @JsonProperty("冲煞") Clash clash,
        @JsonProperty("胎神") String fetalGod,
        @JsonProperty("二十八宿") Mansion mansion,
        @JsonProperty("宜忌") Activities activities) {

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
                FourPillarXunKong.from(source.xunKong()),
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
                        activityResult.dayGrade().classicalName(), yesNo(activityResult.virtuePresent()),
                        yesNo(activityResult.allActivitiesAvoided())));
    }

    private static String yesNo(boolean value) {
        return value ? "是" : "否";
    }

    public record GregorianDate(
            @JsonProperty("日期") LocalDate date,
            @JsonProperty("年") int year,
            @JsonProperty("月") int month,
            @JsonProperty("日") int day,
            @JsonProperty("星期") String weekday,
            @JsonProperty("儒略日数") long julianDayNumber) {

        private static GregorianDate from(AlmanacResponse.GregorianDate source) {
            return new GregorianDate(source.date(), source.year(), source.month(), source.day(),
                    source.weekday(), source.julianDayNumber());
        }
    }

    public record LunarDate(
            @JsonProperty("年") int year,
            @JsonProperty("月") int month,
            @JsonProperty("日") int day,
            @JsonProperty("是否闰月") String leapMonth,
            @JsonProperty("本月天数") int daysInMonth,
            @JsonProperty("中文日期") String display,
            @JsonProperty("月朔日期") LocalDate monthStartDate,
            @JsonProperty("天文朔时刻") Instant astronomicalNewMoon) {

        private static LunarDate from(AlmanacResponse.LunarDate source) {
            return new LunarDate(source.year(), source.month(), source.day(), yesNo(source.leapMonth()),
                    source.daysInMonth(), source.display(), source.monthStartDate(),
                    source.astronomicalNewMoon());
        }
    }

    public record FourPillars(
            @JsonProperty("年柱") Pillar year,
            @JsonProperty("月柱") Pillar month,
            @JsonProperty("日柱") Pillar day,
            @JsonProperty("时柱") Pillar hour) {

        private static FourPillars from(AlmanacResponse.FourPillars source) {
            return new FourPillars(Pillar.from(source.year()), Pillar.from(source.month()),
                    Pillar.from(source.day()), Pillar.from(source.hour()));
        }
    }

    public record Pillar(
            @JsonProperty("干支") String value,
            @JsonProperty("天干") String heavenlyStem,
            @JsonProperty("地支") String earthlyBranch,
            @JsonProperty("生肖") String zodiac,
            @JsonProperty("纳音") String naYin) {

        private static Pillar from(AlmanacResponse.Pillar source) {
            return new Pillar(source.value(), source.heavenlyStem(), source.earthlyBranch(),
                    source.zodiac(), source.naYin());
        }
    }

    public record FourPillarXunKong(
            @JsonProperty("年柱") XunKong year,
            @JsonProperty("月柱") XunKong month,
            @JsonProperty("日柱") XunKong day,
            @JsonProperty("时柱") XunKong hour) {

        private static FourPillarXunKong from(AlmanacResponse.FourPillarXunKong source) {
            return new FourPillarXunKong(XunKong.from(source.year()), XunKong.from(source.month()),
                    XunKong.from(source.day()), XunKong.from(source.hour()));
        }
    }

    public record XunKong(
            @JsonProperty("所属旬") String xunName,
            @JsonProperty("空亡") List<String> emptyBranches) {

        public XunKong {
            emptyBranches = List.copyOf(emptyBranches);
        }

        private static XunKong from(AlmanacResponse.XunKong source) {
            return new XunKong(source.xunName(), source.emptyBranches());
        }
    }

    public record SolarTerm(
            @JsonProperty("当前节气") String currentPeriod,
            @JsonProperty("今日交节") String todayTerm,
            @JsonProperty("节气第几天") int dayInPeriod,
            @JsonProperty("距下个节气天数") long daysUntilNext,
            @JsonProperty("前一节气") TermMoment previous,
            @JsonProperty("下一节气") TermMoment next) {

        private static SolarTerm from(SeasonalContext.SolarTermStatus source) {
            return new SolarTerm(source.currentPeriod(), source.todayTerm(), source.dayInPeriod(),
                    source.daysUntilNext(), TermMoment.from(source.previous()), TermMoment.from(source.next()));
        }
    }

    public record TermMoment(
            @JsonProperty("名称") String name,
            @JsonProperty("交节时刻") ZonedDateTime at) {

        private static TermMoment from(SeasonalContext.TermMoment source) {
            return new TermMoment(source.name(), source.at());
        }
    }

    public record Period(
            @JsonProperty("是否在期内") String active,
            @JsonProperty("名称") String name,
            @JsonProperty("第几天") Integer dayIndex,
            @JsonProperty("总天数") Integer totalDays,
            @JsonProperty("开始日期") LocalDate startDate,
            @JsonProperty("结束日期") LocalDate endDate,
            @JsonProperty("描述") String description) {

        private static Period from(SeasonalContext.PeriodStatus source) {
            return new Period(yesNo(source.active()), source.name(), source.dayIndex(), source.totalDays(),
                    source.startDate(), source.endDate(), source.description());
        }
    }

    public record ShuJiu(
            @JsonProperty("主口径") String primaryConvention,
            @JsonProperty("主结果") Period primary,
            @JsonProperty("并列口径") List<Period> variants) {

        public ShuJiu {
            variants = List.copyOf(variants);
        }

        private static ShuJiu from(SeasonalContext.ShuJiuStatus source) {
            return new ShuJiu(source.primaryConvention(), Period.from(source.primary()),
                    source.variants().stream().map(Period::from).toList());
        }
    }

    public record DayOfficer(
            @JsonProperty("名称") String name,
            @JsonProperty("通常吉凶") String generalNature) {
    }

    public record DutyGod(
            @JsonProperty("值神") String name,
            @JsonProperty("黄黑道") String path,
            @JsonProperty("吉凶") String luck) {
    }

    public record PengZuTaboo(
            @JsonProperty("天干禁忌") String heavenlyStemRule,
            @JsonProperty("地支禁忌") String earthlyBranchRule) {
    }

    public record Clash(
            @JsonProperty("相冲干支") String opposingPillar,
            @JsonProperty("相冲生肖") String zodiac,
            @JsonProperty("煞方") String direction,
            @JsonProperty("冲煞") String description) {
    }

    public record Mansion(
            @JsonProperty("宿名") String name,
            @JsonProperty("全名") String fullName,
            @JsonProperty("吉凶") String luck,
            @JsonProperty("宫位") String palace,
            @JsonProperty("守护") String guardian) {
    }

    public record Activities(
            @JsonProperty("宜") List<String> recommended,
            @JsonProperty("忌") List<String> avoided,
            @JsonProperty("宜忌并存") List<String> caution,
            @JsonProperty("日等") String dayGrade,
            @JsonProperty("有德神") String virtuePresent,
            @JsonProperty("诸事皆忌") String allActivitiesAvoided) {

        public Activities {
            recommended = List.copyOf(recommended);
            avoided = List.copyOf(avoided);
            caution = List.copyOf(caution);
        }
    }
}
