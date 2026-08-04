package cn.wannianli.calendar;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Objects;

import cn.wannianli.calendar.astronomy.JulianDate;

public final class SexagenaryCycle {

    public static final String[] STEMS = {"甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"};
    public static final String[] BRANCHES = {"子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"};
    public static final String[] ZODIAC = {"鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"};
    private static final String[] NAYIN = {
            "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
            "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
            "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水"
    };

    private SexagenaryCycle() {
    }

    public static Cycle year(ZonedDateTime time, Instant startOfSpring) {
        int cycleYear = time.toInstant().isBefore(startOfSpring) ? time.getYear() - 1 : time.getYear();
        return fromIndex(Math.floorMod(cycleYear - 4, 60));
    }

    public static Cycle month(Cycle year, double solarLongitude) {
        int ordinal = (int) Math.floor(normalize(solarLongitude - 315.0) / 30.0);
        int branch = (2 + ordinal) % 12;
        int stem = Math.floorMod(year.stemIndex() * 2 + 2 + ordinal, 10);
        return fromStemBranch(stem, branch);
    }

    public static Cycle day(LocalDate date) {
        int index = Math.floorMod(JulianDate.dayNumber(date) + 49, 60);
        return fromIndex(index);
    }

    /** Late Zi hour remains attached to the civil day used by this API. */
    public static Cycle hour(Cycle civilDay, int hour) {
        int branch = ((hour + 1) / 2) % 12;
        int stem = Math.floorMod(civilDay.stemIndex() * 2 + branch, 10);
        return fromStemBranch(stem, branch);
    }

    public static Cycle fromIndex(int index) {
        int normalized = Math.floorMod(index, 60);
        return new Cycle(normalized, normalized % 10, normalized % 12,
                STEMS[normalized % 10] + BRANCHES[normalized % 12],
                ZODIAC[normalized % 12], NAYIN[normalized / 2]);
    }

    public static XunKong xunKong(Cycle cycle) {
        Objects.requireNonNull(cycle, "cycle");
        int xunStartIndex = cycle.index() / 10 * 10;
        return new XunKong(
                fromIndex(xunStartIndex).name() + "旬",
                List.of(BRANCHES[(xunStartIndex + 10) % 12], BRANCHES[(xunStartIndex + 11) % 12]));
    }

    private static Cycle fromStemBranch(int stem, int branch) {
        for (int i = 0; i < 60; i++) {
            if (i % 10 == stem && i % 12 == branch) {
                return fromIndex(i);
            }
        }
        throw new IllegalArgumentException("Invalid stem-branch pairing: " + stem + "/" + branch);
    }

    private static double normalize(double degrees) {
        double value = degrees % 360.0;
        return value < 0 ? value + 360 : value;
    }

    public record Cycle(
            int index,
            int stemIndex,
            int branchIndex,
            String name,
            String zodiac,
            String naYin) {
    }

    public record XunKong(String xunName, List<String> emptyBranches) {
        public XunKong {
            emptyBranches = List.copyOf(emptyBranches);
        }
    }
}
