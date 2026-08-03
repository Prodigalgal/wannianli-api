package cn.wannianli.almanac;

import static cn.wannianli.calendar.SexagenaryCycle.BRANCHES;
import static cn.wannianli.calendar.SexagenaryCycle.STEMS;
import static cn.wannianli.calendar.SexagenaryCycle.ZODIAC;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import cn.wannianli.almanac.TraditionalAlmanac.Clash;
import cn.wannianli.almanac.TraditionalAlmanac.DayOfficer;
import cn.wannianli.almanac.TraditionalAlmanac.DutyGod;
import cn.wannianli.almanac.TraditionalAlmanac.FetalGod;
import cn.wannianli.almanac.TraditionalAlmanac.Gods;
import cn.wannianli.almanac.TraditionalAlmanac.Mansion;
import cn.wannianli.almanac.TraditionalAlmanac.PengZuTaboo;
import cn.wannianli.calendar.SexagenaryCycle.Cycle;
import cn.wannianli.calendar.astronomy.JulianDate;

public final class TraditionalAlmanacCalculator {

    public static final String XIEJI_VOLUME_1 = "XIEJI_BIANFANGSHU_VOLUME_1";
    public static final String XIEJI_VOLUME_4 = "XIEJI_BIANFANGSHU_VOLUME_4";
    public static final String XIEJI_VOLUME_7 = "XIEJI_BIANFANGSHU_VOLUME_7";
    public static final String YUXIAJI = "YUXIAJI_TRADITION";

    private static final String[] OFFICERS = {"建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"};
    private static final String[] DUTY_GODS = {
            "青龙", "明堂", "天刑", "朱雀", "金匮", "天德", "白虎", "玉堂", "天牢", "玄武", "司命", "勾陈"
    };
    private static final boolean[] YELLOW_PATH = {
            true, true, false, false, true, true, false, true, false, false, true, false
    };
    private static final String[] STEM_TABOOS = {
            "甲不开仓，财物耗散", "乙不栽植，千株不长", "丙不修灶，必见灾殃", "丁不剃头，头必生疮", "戊不受田，田主不祥",
            "己不破券，二比并亡", "庚不经络，织机虚张", "辛不合酱，主人不尝", "壬不汲水，更难提防", "癸不词讼，理弱敌强"
    };
    private static final String[] BRANCH_TABOOS = {
            "子不问卜，自惹祸殃", "丑不冠带，主不还乡", "寅不祭祀，神鬼不尝", "卯不穿井，水泉不香",
            "辰不哭泣，必主重丧", "巳不远行，财物伏藏", "午不苫盖，屋主更张", "未不服药，毒气入肠",
            "申不安床，鬼祟入房", "酉不会客，醉坐颠狂", "戌不吃犬，作怪上床", "亥不嫁娶，不利新郎"
    };
    private static final String[] FETAL_GOD_POSITIONS = {
            "占门碓外东南", "碓磨厕外东南", "厨灶炉外正南", "仓库门外正南", "房床栖外正南", "占门床外正南",
            "占碓磨外正南", "厨灶厕外西南", "仓库炉外西南", "房床门外西南", "门鸡栖外西南", "碓磨床外西南",
            "厨灶碓外西南", "仓库厕外正西", "房床炉外正西", "占大门外正西", "碓磨栖外正西", "厨灶床外正西",
            "仓库碓外西北", "房床厕外西北", "占门炉外西北", "碓磨门外西北", "厨灶栖外西北", "仓库床外西北",
            "房床碓外正北", "占门厕外正北", "碓磨炉外正北", "厨灶门外正北", "仓库栖外正北", "占房床房内北",
            "占门碓房内北", "碓磨厕房内北", "厨灶炉房内北", "仓库门房内北", "房床栖房内中", "占门床房内中",
            "占碓磨房内南", "厨灶厕房内南", "仓库炉房内南", "房床门房内西", "门鸡栖房内东", "碓磨床房内东",
            "厨灶碓房内东", "仓库厕房内东", "房床炉房内中", "占大门外东北", "碓磨栖外东北", "厨灶床外东北",
            "仓库碓外东北", "房床厕外东北", "占门炉外东北", "碓磨门外正东", "厨灶栖外正东", "仓库床外正东",
            "房床碓外正东", "占门厕外正东", "碓磨炉外东南", "厨灶门外东南", "仓库栖外东南", "占房床外东南"
    };
    private static final String[] MANSIONS = {
            "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁",
            "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸"
    };
    private static final String[] MANSION_FULL_NAMES = {
            "角木蛟", "亢金龙", "氐土貉", "房日兔", "心月狐", "尾火虎", "箕水豹",
            "斗木獬", "牛金牛", "女土蝠", "虚日鼠", "危月燕", "室火猪", "壁水貐",
            "奎木狼", "娄金狗", "胃土雉", "昴日鸡", "毕月乌", "觜火猴", "参水猿",
            "井木犴", "鬼金羊", "柳土獐", "星日马", "张月鹿", "翼火蛇", "轸水蚓"
    };
    private static final boolean[] MANSION_LUCK = {
            true, false, false, true, false, true, true, true, false, false, false, false, true, true,
            false, true, true, false, true, false, true, true, false, false, false, true, false, true
    };
    private static final int[] SIX_HARMONY = {1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] SIX_HARM = {7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8};

    public TraditionalAlmanac calculate(LocalDate date, Cycle month, Cycle day, double solarLongitude) {
        DayOfficer officer = dayOfficer(month, day);
        DutyGod dutyGod = dutyGod(month, day);
        Gods gods = gods(month, day, officer.name(), solarLongitude);
        return new TraditionalAlmanac(
                officer,
                dutyGod,
                gods,
                new PengZuTaboo(STEM_TABOOS[day.stemIndex()], BRANCH_TABOOS[day.branchIndex()],
                        YUXIAJI, "C_TRADITIONAL_TRANSMISSION"),
                clash(day),
                new FetalGod(FETAL_GOD_POSITIONS[day.index()], YUXIAJI, "C_TRADITIONAL_TRANSMISSION"),
                mansion(date));
    }

    private DayOfficer dayOfficer(Cycle month, Cycle day) {
        int index = Math.floorMod(day.branchIndex() - month.branchIndex(), 12);
        String nature = switch (index) {
            case 1, 4, 5, 7, 8, 10 -> "通常为吉";
            default -> "通常为凶";
        };
        return new DayOfficer(OFFICERS[index], nature, XIEJI_VOLUME_4);
    }

    private DutyGod dutyGod(Cycle month, Cycle day) {
        int monthBranch = month.branchIndex();
        int qingLongBranch = switch (monthBranch) {
            case 2, 8 -> 0;
            case 3, 9 -> 2;
            case 4, 10 -> 4;
            case 5, 11 -> 6;
            case 0, 6 -> 8;
            case 1, 7 -> 10;
            default -> throw new IllegalStateException("Unexpected branch");
        };
        int index = Math.floorMod(day.branchIndex() - qingLongBranch, 12);
        boolean yellow = YELLOW_PATH[index];
        return new DutyGod(DUTY_GODS[index], yellow ? "黄道" : "黑道", yellow ? "吉" : "凶", XIEJI_VOLUME_7);
    }

    private Gods gods(Cycle month, Cycle day, String officer, double solarLongitude) {
        List<String> good = new ArrayList<>();
        List<String> bad = new ArrayList<>();
        int monthOrdinal = Math.floorMod(month.branchIndex() - 2, 12);

        int monthVirtueStem = new int[]{2, 0, 8, 6}[monthOrdinal % 4];
        if (day.stemIndex() == monthVirtueStem) {
            good.add("月德");
        }
        if (day.stemIndex() == (monthVirtueStem + 5) % 10) {
            good.add("月德合");
        }
        int[] heavenlyVirtueStems = {3, -1, 8, 7, -1, 0, 9, -1, 2, 1, -1, 6};
        int heavenlyVirtueStem = heavenlyVirtueStems[monthOrdinal];
        if (heavenlyVirtueStem >= 0 && day.stemIndex() == heavenlyVirtueStem) {
            good.add("天德");
        }
        if (heavenlyVirtueStem >= 0 && day.stemIndex() == (heavenlyVirtueStem + 5) % 10) {
            good.add("天德合");
        }
        if (isHeavenlyPardon(day, solarLongitude)) {
            good.add("天赦");
        }
        if (isMaternalStorehouse(day.branchIndex(), solarLongitude)) {
            good.add("母仓");
        }
        if (isThreeHarmony(month.branchIndex(), day.branchIndex())) {
            good.add("三合");
        }
        if (SIX_HARMONY[month.branchIndex()] == day.branchIndex()) {
            good.add("六合");
        }
        addOfficerAliases(officer, good, bad);

        int[] threeSha = threeShaBranches(month.branchIndex());
        if (day.branchIndex() == threeSha[0]) {
            bad.add("劫煞");
        }
        if (day.branchIndex() == threeSha[1]) {
            bad.add("灾煞");
            bad.add("天火");
        }
        if (day.branchIndex() == threeSha[2]) {
            bad.add("月煞");
            bad.add("月虚");
        }
        if (SIX_HARM[month.branchIndex()] == day.branchIndex()) {
            bad.add("月害");
        }

        boolean virtue = good.stream().anyMatch(name -> name.equals("天德") || name.equals("月德")
                || name.equals("天德合") || name.equals("月德合") || name.equals("天赦"));
        return new Gods(good, bad, virtue);
    }

    private void addOfficerAliases(String officer, List<String> good, List<String> bad) {
        switch (officer) {
            case "建" -> good.add("兵福");
            case "除" -> {
                good.add("吉期");
                good.add("兵宝");
            }
            case "满" -> {
                good.add("天巫");
                good.add("福德");
                bad.add("天狗");
            }
            case "平" -> bad.add("死神");
            case "破" -> {
                bad.add("月破");
                bad.add("大耗");
            }
            case "定" -> good.add("时阴");
            case "成" -> {
                good.add("天喜");
                good.add("天医");
            }
            case "开" -> {
                good.add("时阳");
                good.add("生气");
            }
            case "闭" -> bad.add("血支");
            default -> {
                // Officers without an alias remain represented by the officer field itself.
            }
        }
    }

    private boolean isHeavenlyPardon(Cycle day, double longitude) {
        if (inArc(longitude, 315, 45)) {
            return day.name().equals("戊寅");
        }
        if (inArc(longitude, 45, 135)) {
            return day.name().equals("甲午");
        }
        if (inArc(longitude, 135, 225)) {
            return day.name().equals("戊申");
        }
        return day.name().equals("甲子");
    }

    private boolean isMaternalStorehouse(int dayBranch, double longitude) {
        if (inArc(longitude, 315, 45)) {
            return dayBranch == 11 || dayBranch == 0;
        }
        if (inArc(longitude, 45, 135)) {
            return dayBranch == 2 || dayBranch == 3;
        }
        if (inArc(longitude, 135, 225)) {
            return dayBranch == 1 || dayBranch == 4 || dayBranch == 7 || dayBranch == 10;
        }
        return dayBranch == 8 || dayBranch == 9;
    }

    private boolean isThreeHarmony(int monthBranch, int dayBranch) {
        int[][] groups = {{8, 0, 4}, {2, 6, 10}, {5, 9, 1}, {11, 3, 7}};
        for (int[] group : groups) {
            boolean hasMonth = false;
            boolean hasDay = false;
            for (int branch : group) {
                hasMonth |= branch == monthBranch;
                hasDay |= branch == dayBranch && branch != monthBranch;
            }
            if (hasMonth && hasDay) {
                return true;
            }
        }
        return false;
    }

    private int[] threeShaBranches(int monthBranch) {
        return switch (monthBranch) {
            case 8, 0, 4 -> new int[]{5, 6, 7};
            case 2, 6, 10 -> new int[]{11, 0, 1};
            case 5, 9, 1 -> new int[]{2, 3, 4};
            case 11, 3, 7 -> new int[]{8, 9, 10};
            default -> throw new IllegalStateException("Unexpected branch");
        };
    }

    private Clash clash(Cycle day) {
        int opposingBranch = (day.branchIndex() + 6) % 12;
        int opposingStem = (day.stemIndex() + 4) % 10;
        String direction = switch (day.branchIndex()) {
            case 5, 9, 1 -> "东";
            case 11, 3, 7 -> "西";
            case 8, 0, 4 -> "南";
            case 2, 6, 10 -> "北";
            default -> throw new IllegalStateException("Unexpected branch");
        };
        String opposingPillar = STEMS[opposingStem] + BRANCHES[opposingBranch];
        String zodiac = ZODIAC[opposingBranch];
        return new Clash(opposingPillar, zodiac, direction,
                "冲" + zodiac + "（" + opposingPillar + "），煞" + direction);
    }

    private Mansion mansion(LocalDate date) {
        LocalDate anchorDate = LocalDate.of(2000, 1, 7);
        int anchorIndex = 22; // Conventional modern seven-yuan sequence: 鬼宿.
        long days = JulianDate.dayNumber(date) - JulianDate.dayNumber(anchorDate);
        int index = Math.floorMod(anchorIndex + days, 28);
        int palaceIndex = index / 7;
        String[] palaces = {"东方青龙", "北方玄武", "西方白虎", "南方朱雀"};
        String[] guardians = {"青龙", "玄武", "白虎", "朱雀"};
        return new Mansion(MANSIONS[index], MANSION_FULL_NAMES[index], MANSION_LUCK[index] ? "吉" : "凶",
                palaces[palaceIndex], guardians[palaceIndex], XIEJI_VOLUME_1,
                "2000-01-07=鬼宿（现代通行七元锚点）", "D_CONVENTIONAL_ANCHOR",
                "《协纪辨方书》确认420日七元周期，但明言绝对起元年月不可考；值宿依赖公开的现代通行锚点，不能宣称为古籍唯一结论。");
    }

    private boolean inArc(double longitude, double start, double end) {
        return start < end
                ? longitude >= start && longitude < end
                : longitude >= start || longitude < end;
    }
}
