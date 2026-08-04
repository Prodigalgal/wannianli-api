package cn.wannianli.service;

import java.time.Clock;
import java.time.ZonedDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import cn.wannianli.almanac.TraditionalAlmanacCalculator;
import cn.wannianli.api.AlmanacResponse;
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
        ZonedDateTime now = ZonedDateTime.now(clock).withZoneSameInstant(TimeConfiguration.UTC_PLUS_8);
        var date = now.toLocalDate();
        ChineseCalendarDate lunar = chineseCalendar.calculate(date);

        var startOfSpring = SolarEphemeris.solarTermInstant(now.getYear(), SolarTerm.START_OF_SPRING,
                TimeConfiguration.UTC_PLUS_8);
        Cycle yearPillar = SexagenaryCycle.year(now, startOfSpring);
        double longitude = SolarEphemeris.longitudeAt(now.toInstant());
        Cycle monthPillar = SexagenaryCycle.month(yearPillar, longitude);
        Cycle dayPillar = SexagenaryCycle.day(date);
        Cycle hourPillar = SexagenaryCycle.hour(dayPillar, now.getHour());

        var traditional = traditionalCalculator.calculate(date, monthPillar, dayPillar, longitude);
        var activities = ruleEngine.evaluate(date, monthPillar, dayPillar, traditional, longitude);
        return new AlmanacResponse(
                new ResponseMeta("v1", "每次请求只计算当前UTC+08:00时间；接口不接受目标日期或时区。"),
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
                "太阳采用IMCCE VSOP87D地球主项、章动/光行差/FK5修正并求根；真朔采用Meeus周期项；以Espenak-Meeus ΔT换算TT/UT。",
                "1801-2199（当前接口仅计算今天）",
                "固定UTC+08:00偏移（不依赖上海或北京时区数据库）",
                new Validation(
                        "关键历法样例必须匹配政府天文机构年历；内部关系通过公式不变量测试。",
                        List.of("香港天文台2026全年365日农历对照", "香港天文台2020-2030春节日期",
                                "香港天文台2026大暑、立秋、处暑及七月朔分钟值",
                                "香港天文台2014冬至同日朔、2015春节边界"),
                        List.of("朔望月长度只能为29或30日", "冬至所在月为十一月", "闰月为十三个月中首个无中气月",
                                "干支索引、六旬旬空、建除与十二值神均按模周期闭合")),
                List.of(
                        "节气时刻为项目内数值结果；2026年8月四个分钟值已对齐香港天文台，其他年份仍不冒充官方发布值。",
                        "二十八宿绝对起元在《协纪辨方书》中明载不可考，响应使用公开的现代通行锚点并降低证据等级。",
                        "彭祖百忌据《玉匣记》转录；胎神六十日方位表另列为近现代通书传承，两者证据等级均低于《协纪辨方书》。",
                        "神煞规则集以已逐条校勘的核心规则为范围；未校勘条目不会猜测或借用第三方历法库。"));
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
