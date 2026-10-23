package cn.wannianli.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import cn.wannianli.almanac.TraditionalAlmanacCalculator;
import cn.wannianli.api.AlmanacResponse;
import cn.wannianli.api.AlmanacCalculationRequest;
import cn.wannianli.api.AlmanacResponse.CalculationDisclosure;
import cn.wannianli.api.AlmanacResponse.FourPillarXunKong;
import cn.wannianli.api.AlmanacResponse.FourPillars;
import cn.wannianli.api.AlmanacResponse.GregorianDate;
import cn.wannianli.api.AlmanacResponse.LunarDate;
import cn.wannianli.api.AlmanacResponse.Pillar;
import cn.wannianli.api.AlmanacResponse.ResponseMeta;
import cn.wannianli.api.AlmanacResponse.Validation;
import cn.wannianli.api.AlmanacResponse.XunKong;
import cn.wannianli.api.ReferenceCatalog;
import cn.wannianli.api.CalculationScope;
import cn.wannianli.calendar.ChineseCalendarCalculator;
import cn.wannianli.calendar.ChineseCalendarDate;
import cn.wannianli.calendar.SeasonalCalculator;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.calendar.SexagenaryCycle.Cycle;
import cn.wannianli.calendar.astronomy.JulianDate;
import cn.wannianli.calendar.astronomy.SolarEphemeris;
import cn.wannianli.calendar.astronomy.SolarTerm;
import cn.wannianli.config.TimeConfiguration;
import cn.wannianli.rules.ActivityRuleEngine;
import cn.wannianli.rules.CalendarDayRules;

@Service
public class AlmanacService {

    private final Clock clock;
    private final ChineseCalendarCalculator chineseCalendar;
    private final SeasonalCalculator seasonalCalculator;
    private final TraditionalAlmanacCalculator traditionalCalculator = new TraditionalAlmanacCalculator();
    private final ActivityRuleEngine ruleEngine = new ActivityRuleEngine();

    public AlmanacService(Clock clock) {
        this.clock = clock;
        this.chineseCalendar = new ChineseCalendarCalculator(TimeConfiguration.UTC_PLUS_8);
        this.seasonalCalculator = new SeasonalCalculator(TimeConfiguration.UTC_PLUS_8);
    }

    public AlmanacResponse current() {
        return calculateAt(ZonedDateTime.now(clock));
    }

    public AlmanacResponse calculate(AlmanacCalculationRequest request) {
        LocalDate date;
        if ("农历".equals(request.calendar())) {
            date = chineseCalendar.toGregorian(request.year(), request.month(), request.day(), request.leapMonth());
        } else {
            try {
                date = LocalDate.of(request.year(), request.month(), request.day());
            } catch (DateTimeException error) {
                throw new IllegalArgumentException("公历日期不存在", error);
            }
        }
        return calculateAt(date.atTime(request.hour(), request.minute(), request.second())
                .atZone(TimeConfiguration.UTC_PLUS_8));
    }

    public AlmanacResponse calculateAt(ZonedDateTime time) {
        ZonedDateTime now = time.withZoneSameInstant(TimeConfiguration.UTC_PLUS_8);
        var date = now.toLocalDate();
        ChineseCalendarDate lunar = chineseCalendar.calculate(date);

        var startOfSpring = SolarEphemeris.solarTermInstant(now.getYear(), SolarTerm.START_OF_SPRING,
                TimeConfiguration.UTC_PLUS_8);
        Cycle yearPillar = SexagenaryCycle.year(now, startOfSpring);
        double longitude = SolarEphemeris.longitudeAt(now.toInstant());
        Cycle monthPillar = SexagenaryCycle.month(yearPillar, longitude);
        Cycle dayPillar = SexagenaryCycle.day(date);
        Cycle hourPillar = SexagenaryCycle.hour(dayPillar, now.getHour());

        var traditional = traditionalCalculator.calculate(date, yearPillar, monthPillar, dayPillar, longitude);
        var calendarDays = CalendarDayRules.calculate(date, lunar);
        traditional = CalendarDayRules.annotate(traditional, calendarDays);
        var activities = ruleEngine.evaluate(date, monthPillar, dayPillar, traditional, longitude, calendarDays);
        return new AlmanacResponse(
                new ResponseMeta("v1", "按UTC+08:00计算指定时刻；current接口使用当前时间，calculate接口接受公历或农历日期时间。"),
                now,
                new GregorianDate(date, date.getYear(), date.getMonthValue(), date.getDayOfMonth(),
                        chineseWeekday(date.getDayOfWeek().getValue()),
                        JulianDate.dayNumber(date)),
                new LunarDate(lunar.year(), lunar.month(), lunar.day(), lunar.leapMonth(), lunar.daysInMonth(),
                        lunar.display(), lunar.monthStartDate(), lunar.astronomicalNewMoon()),
                new FourPillars(pillar(yearPillar), pillar(monthPillar), pillar(dayPillar), pillar(hourPillar),
                        "年柱以立春精确时刻换年，月柱以节交接，日柱按UTC+08:00民用日且晚子时不换日，时柱按双小时辰。",
                        List.of("LI_XUZHONG_MINGSHU_VOLUME_3", "SANMING_TONGHUI_VOLUME_2",
                                "WUXING_DAYI_VOLUME_1", "SANMING_TONGHUI_VOLUME_1")),
                new FourPillarXunKong(xunKong(yearPillar), xunKong(monthPillar), xunKong(dayPillar),
                        xunKong(hourPillar),
                        List.of("ZENGSHAN_BUYI_CHAPTER_26", "GUJIN_TUSHU_JICHENG_VOLUME_592")),
                yearPillar.zodiac(),
                seasonalCalculator.calculate(now),
                traditional,
                activities,
                disclosure(),
                ReferenceCatalog.all());
    }

    private Pillar pillar(Cycle cycle) {
        return new Pillar(cycle.name(), SexagenaryCycle.STEMS[cycle.stemIndex()],
                SexagenaryCycle.BRANCHES[cycle.branchIndex()], cycle.zodiac(), cycle.naYin());
    }

    private XunKong xunKong(Cycle cycle) {
        var value = SexagenaryCycle.xunKong(cycle);
        return new XunKong(value.xunName(), value.emptyBranches());
    }

    private CalculationDisclosure disclosure() {
        return new CalculationDisclosure(
                false,
                "依据GB/T 33661-2017规则，自行计算朔日、节气、冬至月、无中气置闰与月序。",
                "太阳采用IMCCE VSOP87D地球主项、章动/光行差/FK5修正并求根；真朔采用Meeus第二版式49.1及周期项；ΔT采用USNO观测和明确披露的工程外推。",
                "对应公历日期1801-01-01至2199-12-31",
                "固定UTC+08:00偏移（不依赖上海或北京时区数据库）",
                new Validation(
                        "关键历法样例必须匹配政府天文机构年历；内部关系通过公式不变量测试。",
                        List.of("香港天文台2026全年365日农历对照", "香港天文台2020-2030春节日期",
                                "香港天文台2026大暑、立秋、处暑及七月朔分钟值",
                                "香港天文台2014冬至同日朔、2015春节边界"),
                        List.of("朔望月长度只能为29或30日", "冬至所在月为十一月", "闰月为十三个月中首个无中气月",
                                "干支索引、六旬旬空、建除与十二值神均按模周期闭合")),
                CalculationScope.LIMITATIONS);
    }

    private String chineseWeekday(int isoDayOfWeek) {
        return switch (isoDayOfWeek) {
            case 1 -> "星期一";
            case 2 -> "星期二";
            case 3 -> "星期三";
            case 4 -> "星期四";
            case 5 -> "星期五";
            case 6 -> "星期六";
            case 7 -> "星期日";
            default -> throw new IllegalArgumentException("Invalid ISO weekday: " + isoDayOfWeek);
        };
    }
}
