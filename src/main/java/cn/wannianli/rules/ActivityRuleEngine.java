package cn.wannianli.rules;

import static cn.wannianli.rules.ActivityResult.DayGrade.INFERIOR;
import static cn.wannianli.rules.ActivityResult.DayGrade.LOWEST;
import static cn.wannianli.rules.ActivityResult.DayGrade.MIDDLE;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SexagenaryCycle.Cycle;
import cn.wannianli.rules.ActivityResult.ActivityDecision;
import cn.wannianli.rules.ActivityResult.ConflictPolicy;
import cn.wannianli.rules.ActivityResult.DayGrade;
import cn.wannianli.rules.ActivityResult.Disposition;
import cn.wannianli.rules.ActivityResult.RuleHit;

public final class ActivityRuleEngine {

    public static final String XIEJI_VOLUME_10 = "XIEJI_BIANFANGSHU_VOLUME_10";
    private static final String CANONICAL = "B_PRIMARY_TEXT_TRANSCRIPTION";
    private static final String TRANSMITTED = "C_TRADITIONAL_TRANSMISSION";

    private static final List<String> VIRTUE_RECOMMENDS = activities(
            "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事," +
            "行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,出师,上官赴任,临政亲民," +
                    "结婚姻,纳采问名,嫁娶,搬移,解除,求医,疗病,裁制,营建宫室,缮城郭,兴造动土,竖柱上梁,修仓库,栽种,牧养,纳畜,安葬");
    private static final List<String> HEAVENLY_PARDON_RECOMMENDS = VIRTUE_RECOMMENDS.stream()
            .filter(activity -> !activity.equals("出师"))
            .toList();
    private static final List<String> HEAVENLY_GRACE_RECOMMENDS = activities(
            "覃恩,肆赦,施恩惠恤孤独,布政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会");
    private static final List<String> SEASONAL_VIRTUE_RECOMMENDS = activities(
            "祭祀,祈福,求嗣,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民," +
                    "结婚姻,纳采问名,搬移,解除,求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁," +
                    "纳财,开仓库,出货财,栽种,牧养");
    private static final List<String> ROYAL_DAY_RECOMMENDS = activities(
            "颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事,行惠爱," +
                    "雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,上官赴任,临政亲民,裁制");
    private static final List<String> OFFICE_DAY_RECOMMENDS = activities("袭爵受封,上官赴任,临政亲民");
    private static final List<String> GUARDING_DAY_RECOMMENDS = activities("袭爵受封,上官赴任,临政亲民,安抚边境");
    private static final List<String> PEOPLE_DAY_RECOMMENDS = activities(
            "宴会,结婚姻,纳采问名,进人口,搬移,开市,立券,交易,纳财,栽种,牧养,纳畜");
    private static final List<String> THREE_SHA_AVOIDS = activities(
            "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除," +
                    "整容,剃头,整手足甲,求医,疗病,裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁," +
                    "修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,开渠,穿井,安碓硙," +
                    "补垣,塞穴,修饰垣墙,破屋,坏垣,栽种,牧养,纳畜,破土,安葬,启攒");
    private static final List<String> MONTH_BREAK_AVOIDS = activities(
            "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,整容," +
                    "剃头,整手足甲,裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络," +
                    "酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,开渠,穿井,安碓硙,补垣,塞穴,修饰垣墙," +
                    "伐木,栽种,牧养,纳畜,破土,安葬,启攒");
    private static final List<String> LIMITED_SEVERE_AVOIDS = activities("安抚边境,选将,训兵,出师,求医,疗病");

    private static final Map<String, RuleSpec> OFFICER_RULES = officerRules();
    private static final String[] STEM_ACTIVITY = {"开仓库", "栽种", "修灶", "剃头", "受田", "破券", "经络", "合酱", "决水", "词论"};
    private static final String[] BRANCH_ACTIVITY = {"问卜", "冠带", "祭祀", "穿井", "哭泣", "远行", "苫盖", "服药", "安床", "会客", "食犬", "嫁娶"};

    public ActivityResult evaluate(LocalDate date, Cycle month, Cycle day, TraditionalAlmanac almanac,
                                   double solarLongitude) {
        List<RuleHit> hits = new ArrayList<>();
        RuleSpec officer = OFFICER_RULES.get(almanac.dayOfficer().name());
        hits.add(hit(officer, "日支与节月月支推得" + almanac.dayOfficer().name() + "日"));
        addAuspiciousGodRules(hits, almanac);
        addInauspiciousGodRules(hits, month, almanac);
        addOfficerCombinationRules(hits, almanac, solarLongitude);
        hits.addAll(ClassicalGods.hits(month, day, almanac));
        for (var entry : ClassicalRules.rows(ClassicalRules.placement(), "dayTaboos")) {
            if (entry.containsKey("branch") && !entry.get("branch").equals(day.branchIndex())
                    || entry.containsKey("stem") && !entry.get("stem").equals(day.stemIndex())) continue;
            hits.add(new RuleHit((String) entry.get("id"), "铺注百忌互注", "制化专例", XIEJI_VOLUME_10, CANONICAL,
                    List.of(), ClassicalRules.strings(entry, "avoids"), "命中卷十互注所列日干支",
                    "卷十百忌与铺注条例联读；出行规范为远行，原文明定不注相联宜项。"));
        }
        if (day.branchIndex() == 9) {
            hits.add(new RuleHit("DAY_BRANCH_YOU_RETAINED_TABOOS", "酉日用事专例", "制化专例",
                    XIEJI_VOLUME_10, CANONICAL, List.of(), activities("宴会"),
                    "当日地支为酉", "卷十明定凡酉日忌宴会，并且庆赐赏贺不注宜。"));
        }
        hits.add(new RuleHit("DUTY_GOD_" + almanac.dutyGod().name(), almanac.dutyGod().name(), "黄黑道十二值神",
                "XIEJI_BIANFANGSHU_VOLUME_7", CANONICAL, List.of(), List.of(),
                "当日值" + almanac.dutyGod().name() + "，属" + almanac.dutyGod().path(),
                "卷十明言六黄道、六黑道无专宜专忌；仅作吉凶背景，不机械生成活动。"));
        hits.add(supplemental("PENGZU_STEM_" + day.name(), "彭祖百忌·天干", STEM_ACTIVITY[day.stemIndex()],
                almanac.pengZu().heavenlyStemRule()));
        hits.add(supplemental("PENGZU_BRANCH_" + day.name(), "彭祖百忌·地支", BRANCH_ACTIVITY[day.branchIndex()],
                almanac.pengZu().earthlyBranchRule()));

        if (almanac.dayOfficer().name().equals("破") && Set.of(0, 6, 7, 8).contains(month.branchIndex())) {
            hits.add(new RuleHit("MONTH_BREAK_COMPOUNDED_RETAINED_TABOOS", "月破叠煞专例", "制化专例",
                    XIEJI_VOLUME_10, CANONICAL, List.of(), activities("解除,求医,疗病,破屋,坏垣"),
                    "子午月月破叠灾煞，或未申月月破叠月刑",
                    "卷十月破条：逢德仍忌解除、求医疗病、破屋坏垣，无德诸事皆忌。"));
        }
        if (almanac.dayOfficer().name().equals("破") && switch (month.branchIndex()) {
            case 5 -> day.name().equals("癸亥");
            case 11 -> day.name().equals("丁巳");
            case 7 -> day.name().equals("癸丑");
            case 1 -> day.name().equals("丁未");
            default -> false;
        }) {
            hits.add(new RuleHit("MONTH_BREAK_ABSOLUTE_RETAINED_TABOOS", "月破阴阳专例", "制化专例",
                    XIEJI_VOLUME_10, CANONICAL, List.of(), List.of(), "月破叠阴阳交破或阳破阴冲",
                    "卷十：四月癸亥、十月丁巳、六月癸丑、十二月丁未诸事皆忌。"));
        }
        Map<String, Object> monthly = ClassicalRules.monthly(month, almanac);
        if (!ClassicalRules.pressing(month, day).isEmpty()) hits.add(new RuleHit("PRESSING_PLACEMENT", "岁薄逐阵铺注",
                "铺注专例", XIEJI_VOLUME_10, CANONICAL, List.of(), ClassicalGods.aversionAvoids(), "卷十岁薄逐阵日",
                "所宜照月厌所忌删，所忌仍从本日；不凭此条新增忌。"));
        if (ClassicalRules.universalRelief(month, day)) {
            monthly = new LinkedHashMap<>(monthly);
            monthly.put("allRelieved", true);
            monthly.putIfAbsent("id", "EIGHT_RELIEF");
            monthly.putIfAbsent("officer", almanac.dayOfficer().name());
            monthly.putIfAbsent("grade", "UNDETERMINED");
            monthly.putIfAbsent("note", "卷十明列八个德赦愿会合干支，诸事不忌，不自动生成宜。");
        }
        if (!monthly.isEmpty()) {
            hits.add(new RuleHit("MONTHLY_" + monthly.get("id"), monthly.get("officer") + "日逐月制化", "逐月组合",
                    XIEJI_VOLUME_10, CANONICAL, List.of(), ClassicalRules.strings(monthly, "addAvoids"),
                    "节月支=" + month.branchIndex(), (String) monthly.get("note")));
            if (!ClassicalRules.strings(monthly, "retained").isEmpty()) hits.add(new RuleHit(
                    "MONTHLY_" + monthly.get("id") + "_RETAINED_TABOOS", "逐月仍忌用事", "制化专例",
                    XIEJI_VOLUME_10, CANONICAL, List.of(), ClassicalRules.strings(monthly, "retained"),
                    "节月支=" + month.branchIndex(), (String) monthly.get("note")));
        }
        boolean absolute = !ClassicalRules.absolute(month, day).isEmpty()
                || almanac.dayOfficer().name().equals("破") && almanac.gods().inauspicious().contains("四废");
        if (absolute) hits.add(new RuleHit("ABSOLUTE_CLASSICAL_RETAINED_TABOOS", "诸事皆忌专例", "制化专例",
                XIEJI_VOLUME_10, CANONICAL, List.of(), List.of(), "阴阳专日或四废叠月破", "卷十明定诸事皆忌，优先于普通逐月条件。"));
        DayGrade grade = absolute ? LOWEST : monthly.isEmpty() ? grade(hits, month) : DayGrade.valueOf((String) monthly.get("grade"));
        boolean relief = (!Boolean.TRUE.equals(monthly.get("onlySpecifiedRelief")) && almanac.gods().virtuePresent())
                || ClassicalRules.strings(monthly, "reliefGods").stream().anyMatch(almanac.gods().auspicious()::contains);
        boolean allAvoided = grade == LOWEST || (grade == INFERIOR && !relief);
        return resolve(hits, grade, almanac.gods().virtuePresent(), allAvoided, monthly, day, relief);
    }

    private void addAuspiciousGodRules(List<RuleHit> hits, TraditionalAlmanac almanac) {
        for (String god : almanac.gods().auspicious()) {
            switch (god) {
                case "天德", "月德", "天德合", "月德合" -> hits.add(new RuleHit(
                        "VIRTUE_" + god + "_RETAINED_TABOOS", god, "吉神", XIEJI_VOLUME_10, CANONICAL, VIRTUE_RECOMMENDS, activities("畋猎,取鱼"), "命中" + god + "起例",
                        "卷十列为上吉；忌畋猎取鱼以免伤生气。"));
                case "天赦" -> hits.add(new RuleHit(
                        "HEAVENLY_PARDON_RETAINED_TABOOS", "天赦", "吉神", XIEJI_VOLUME_10, CANONICAL, HEAVENLY_PARDON_RECOMMENDS, activities("畋猎,取鱼"), "命中四时天赦干支",
                        "天地合德、四时旺辰，能解诸凶；不用于出师。"));
                case "天恩" -> hits.add(new RuleHit(
                        "HEAVENLY_GRACE", "天恩", "吉神", XIEJI_VOLUME_10, CANONICAL, HEAVENLY_GRACE_RECOMMENDS, List.of(), "命中六十甲子天恩日段",
                        "卷五起例、卷十逐项用事。"));
                case "月恩" -> hits.add(seasonalVirtue("MONTH_GRACE", "月恩"));
                case "四相" -> hits.add(seasonalVirtue("FOUR_PHASES", "四相"));
                case "时德" -> hits.add(seasonalVirtue("SEASONAL_VIRTUE", "时德"));
                case "王日" -> hits.add(new RuleHit(
                        "ROYAL_DAY", "王日", "吉神", XIEJI_VOLUME_10, CANONICAL, ROYAL_DAY_RECOMMENDS, List.of(), "命中四时王日支", "卷五校订起例、卷十逐项用事。"));
                case "官日", "相日" -> hits.add(new RuleHit(
                        god.equals("官日") ? "OFFICIAL_DAY" : "ASSISTING_DAY", god, "吉神",
                        XIEJI_VOLUME_10, CANONICAL, OFFICE_DAY_RECOMMENDS, List.of(),
                        "命中四时" + god + "支", "卷五校订起例、卷十逐项用事。"));
                case "守日" -> hits.add(new RuleHit(
                        "GUARDING_DAY", "守日", "吉神", XIEJI_VOLUME_10, CANONICAL, GUARDING_DAY_RECOMMENDS, List.of(), "命中四时守日支", "卷五校订起例、卷十逐项用事。"));
                case "民日" -> hits.add(new RuleHit(
                        "PEOPLE_DAY", "民日", "吉神", XIEJI_VOLUME_10, CANONICAL, PEOPLE_DAY_RECOMMENDS, List.of(), "命中四时民日支", "卷五校订起例、卷十逐项用事。"));
                case "母仓" -> hits.add(new RuleHit(
                        "MATERNAL_STOREHOUSE", "母仓", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("纳财,栽种,牧养,纳畜"), List.of(), "命中四时母仓日支",
                        "卷五起例、卷十宜忌。"));
                case "月空" -> hits.add(new RuleHit("MONTH_EMPTY", god, "吉神", XIEJI_VOLUME_10, CANONICAL,
                        List.of("上册进表章"), List.of(), "卷五月德对干", "卷十月空宜上表章；活动词规范为上册进表章。"));
                case "天愿" -> {
                    List<String> recommends = new ArrayList<>(VIRTUE_RECOMMENDS.stream()
                            .filter(a -> !Set.of("出师", "解除", "求医", "疗病").contains(a)).toList());
                    recommends.addAll(activities("进人口,经络,酝酿,开市,立券,交易,纳财"));
                    hits.add(new RuleHit("HEAVENLY_WISH", god, "吉神", XIEJI_VOLUME_10, CANONICAL, recommends, List.of(),
                            "卷五最终校订十二月天愿干支", "卷十天愿所宜；不用出师、解除疗病。"));
                }
                case "解神", "除神" -> hits.add(new RuleHit(god.equals("解神") ? "RELEASING_GOD" : "REMOVING_GOD", god,
                        "吉神", XIEJI_VOLUME_10, CANONICAL, activities(god.equals("解神")
                        ? "上册进表章,陈词讼,解除,沐浴,整容,剃头,整手足甲,求医,疗病"
                        : "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇"), List.of(),
                        "卷五日神起例", "卷十逐项用事；上表章规范为上册进表章。"));
                case "五合" -> hits.add(new RuleHit("FIVE_HARMONY", god, "吉神", XIEJI_VOLUME_10, CANONICAL,
                        activities("宴会,结婚姻,立券,交易"), List.of(), "寅卯日", "卷十五合所宜；不推广为嫁娶。"));
                case "三合" -> hits.add(new RuleHit(
                        "THREE_HARMONY", "三合", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("庆赐赏贺,宴会,结婚姻,纳采问名,嫁娶,进人口,裁制,修宫室,缮城郭,兴造动土," +
                                "竖柱上梁,修仓库,经络,酝酿,立券,交易,纳财,安碓硙,纳畜"),
                        List.of(), "日支与月建构成三合", "卷十称三合为日之吉者所重。"));
                case "六合" -> hits.add(new RuleHit(
                        "SIX_HARMONY", "六合", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("宴会,结婚姻,嫁娶,进人口,经络,酝酿,立券,交易,纳财,纳畜,安葬"),
                        List.of(), "日支与月建六合", "卷十称六合之吉不减三合。"));
                default -> {
                    // Officer aliases are already incorporated in the officer's canonical rule.
                }
            }
        }
    }

    private void addInauspiciousGodRules(List<RuleHit> hits, Cycle month, TraditionalAlmanac almanac) {
        Set<String> bad = Set.copyOf(almanac.gods().inauspicious());
        if (bad.contains("五离")) {
            boolean relieved = almanac.gods().auspicious().stream()
                    .anyMatch(Set.of("天德", "月德", "天德合", "月德合", "天赦", "三合", "六合")::contains);
            if (!relieved) hits.add(new RuleHit("FIVE_SEPARATIONS_RETAINED_TABOOS", "五离", "凶煞", XIEJI_VOLUME_10,
                    CANONICAL, List.of(), activities("庆赐赏贺,宴会,结婚姻,纳采问名,立券,交易"),
                    "申酉日且无德合赦三合六合解忌", "卷十五离所忌及指定解忌，月恩四相不在此列。"));
        }
        List<String> earthwork = activities("营建宫室,修宫室,缮城郭,筑堤防,兴造动土,修仓库,修置产室,开渠,穿井,安碓硙,补垣,修饰垣墙,平治道涂,破屋,坏垣,栽种,破土");
        if (bad.contains("土府") || bad.contains("土王用事")) {
            for (String name : List.of("土府", "土王用事")) {
                if (bad.contains(name)) hits.add(new RuleHit("EARTHWORK_" + name + "_RETAINED_TABOOS", name,
                        "土工专忌", XIEJI_VOLUME_10, CANONICAL, List.of(), earthwork,
                        name.equals("土府") ? "建日同位土府" : "四立前十八个UTC+08:00民用日",
                        "卷十土府条逢德仍忌土工；土王用事条明言义同土府。"));
            }
        }
        if (bad.contains("死气")) {
            boolean relief = almanac.gods().virtuePresent() && !Set.of(4, 10).contains(month.branchIndex());
            hits.add(new RuleHit("DEAD_QI_RETAINED_TABOOS", "死气", "凶煞", XIEJI_VOLUME_10, CANONICAL,
                    List.of(), relief ? LIMITED_SEVERE_AVOIDS
                            : activities("安抚边境,选将,训兵,出师,解除,求医,疗病,修置产室,栽种"),
                    "定日同位死气", relief ? "卷十逢四德止忌军事及求医疗病。"
                            : "卷十死气本忌；辰戌月叠月厌，逢四德仍忌。"));
        }
        if (bad.contains("小耗")) {
            boolean retained = Set.of(0, 3, 6, 9).contains(month.branchIndex());
            boolean relief = (almanac.gods().virtuePresent() || almanac.gods().auspicious().contains("天愿")) && !retained;
            hits.add(new RuleHit(retained ? "SMALL_CONSUMPTION_RETAINED_TABOOS" : "SMALL_CONSUMPTION",
                    "小耗", "凶煞", XIEJI_VOLUME_10, CANONICAL, List.of(), relief ? List.of()
                            : activities("修仓库,开市,立券,交易,纳财,开仓库,出货财"),
                    "执日同位小耗", "卷十逢四德或天愿不忌；子午卯酉月叠劫煞则逢德仍忌。"));
        }
        if (bad.contains("劫煞")) {
            hits.add(severe("ROBBERY_SHA", "劫煞", THREE_SHA_AVOIDS, "命中月建三合绝地"));
        }
        if (bad.contains("灾煞")) {
            boolean canonicalRelief = almanac.gods().virtuePresent()
                    && almanac.dayOfficer().name().equals("满")
                    && Set.of(1, 4, 7, 10).contains(month.branchIndex());
            List<String> avoids = canonicalRelief ? LIMITED_SEVERE_AVOIDS : THREE_SHA_AVOIDS;
            String ruleId = canonicalRelief ? "DISASTER_SHA_RETAINED_TABOOS" : "DISASTER_SHA";
            hits.add(new RuleHit(ruleId, "灾煞", "凶煞", XIEJI_VOLUME_10, CANONICAL, List.of(), avoids, "命中月建三合正冲",
                    canonicalRelief
                            ? "卷十专例：辰戌丑未月满日与德神并，止忌军事及求医疗病，其余不忌。"
                            : "灾煞所忌同劫煞；天火另忌苫盖。"));
            if (!canonicalRelief) {
                hits.add(new RuleHit("HEAVENLY_FIRE", "天火", "凶煞", XIEJI_VOLUME_10, CANONICAL, List.of(), activities("苫盖"), "灾煞同位天火", "卷十专忌苫盖。"));
            }
        }
        if (bad.contains("月煞")) {
            List<String> avoids = new ArrayList<>(THREE_SHA_AVOIDS);
            avoids.addAll(activities("开仓库,出货财"));
            hits.add(severe("MONTH_SHA", "月煞", avoids, "命中月建三合尽地"));
        }
        if (bad.contains("月害")) {
            hits.add(new RuleHit("MONTH_HARM", "月害", "凶煞", XIEJI_VOLUME_10, CANONICAL, List.of(), activities("祈福,求嗣,上册进表章,庆赐赏贺,宴会,安抚边境,选将,训兵,出师," +
                            "结婚姻,纳采问名,嫁娶,进人口,求医,疗病,修仓库,经络,酝酿,开市,立券,交易,纳财," +
                            "开仓库,出货财,修置产室,牧养,纳畜,破土,安葬,启攒"),
                    "日支冲月建六合之支", "卷十称月害之凶轻于刑煞，但非德不可解。"));
        }
        if (bad.contains("天狗")) {
            hits.add(new RuleHit("TIAN_GOU_RETAINED_TABOOS", "天狗", "凶煞", XIEJI_VOLUME_10,
                    CANONICAL, List.of(), activities("祭祀"), "申月戌日为满日",
                    "卷十明定天狗忌祭祀，与德神并仍忌；祈福、求嗣不注宜。"));
        }
    }

    private RuleHit seasonalVirtue(String id, String name) {
        return new RuleHit(id, name, "吉神", XIEJI_VOLUME_10, CANONICAL, SEASONAL_VIRTUE_RECOMMENDS, List.of(), "命中四时" + name + "起例",
                "卷五起例、卷十将月恩、四相、时德合列用事。" );
    }

    private void addOfficerCombinationRules(List<RuleHit> hits, TraditionalAlmanac almanac,
                                            double solarLongitude) {
        String officer = almanac.dayOfficer().name();
        List<String> seasonal = new ArrayList<>();
        if (officer.equals("危") && inArc(solarLongitude, 225, 315)) {
            seasonal.add("伐木");
        }
        if (Set.of("执", "危", "收").contains(officer) && inArc(solarLongitude, 210, 315)) {
            seasonal.add("畋猎");
        }
        if (Set.of("执", "危", "收").contains(officer) && inArc(solarLongitude, 330, 45)) {
            seasonal.add("取鱼");
        }
        if (!seasonal.isEmpty()) {
            hits.add(new RuleHit("OFFICER_SEASONAL_" + officer, officer + "日节令用事", "建除节令组合",
                    XIEJI_VOLUME_10, CANONICAL, List.copyOf(new LinkedHashSet<>(seasonal)), List.of(),
                    "命中" + officer + "日及相应太阳黄经区间", "卷十依霜降、立冬、雨水、立春、立夏限定伐木畋猎取鱼。"));
        }
        if (officer.equals("收") && almanac.gods().auspicious().stream()
                .anyMatch(Set.of("月恩", "四相", "时德")::contains)) {
            hits.add(new RuleHit("OFFICER_RECEIVE_STOREHOUSE_COMBINATION", "收日修仓库组合", "建除神煞组合",
                    XIEJI_VOLUME_10, CANONICAL, activities("修仓库"), List.of(),
                    "收日与月恩、四相或时德同现", "卷十明定收日无修造义，须与月恩、四相、时德并后才宜修仓库。"));
        }
        Set<String> good = Set.copyOf(almanac.gods().auspicious());
        if (good.contains("母仓") && (good.contains("月恩") || good.contains("四相") || officer.equals("开"))) {
            hits.add(new RuleHit("MATERNAL_STOREHOUSE_REPAIR_COMBINATION", "母仓修仓库组合", "吉神组合",
                    XIEJI_VOLUME_10, CANONICAL, activities("修仓库"), List.of(),
                    "母仓与月恩、四相或开日同现", "卷十明定母仓须与月恩、四相或开日并，才宜修仓库。"));
        }
    }

    private boolean inArc(double longitude, double start, double end) {
        return start < end
                ? longitude >= start && longitude < end
                : longitude >= start || longitude < end;
    }

    private RuleHit severe(String id, String name, List<String> avoids, String match) {
        return new RuleHit(id, name, "凶煞", XIEJI_VOLUME_10, CANONICAL, List.of(), avoids, match, "按卷十逐项宜忌及六等制化处理。" );
    }

    private RuleHit supplemental(String id, String name, String activity, String text) {
        return new RuleHit(id, name, "传统附加禁忌", "YUXIAJI_TRADITION", TRANSMITTED, List.of(), List.of(activity), text,
                "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。" );
    }

    private ActivityResult resolve(List<RuleHit> hits, DayGrade grade, boolean virtue, boolean allAvoided,
                                   Map<String, Object> monthly, Cycle day, boolean relief) {
        Map<String, Evidence> evidence = new LinkedHashMap<>();
        Set<String> suppressedActivities = ClassicalRules.suppressRecommendations(hits, day);
        Set<String> noAvoid = new LinkedHashSet<>();
        boolean allRelieved = Boolean.TRUE.equals(monthly.get("allRelieved"));
        Set<String> relievedRules = new LinkedHashSet<>(ClassicalRules.strings(monthly, "relieveRules"));
        hits.stream().filter(hit -> hit.ruleId().startsWith("CLASSICAL_RAW_")).forEach(hit -> relievedRules.add(hit.ruleId()));
        if (grade == DayGrade.SUPERIOR || relief && (grade == MIDDLE || grade == DayGrade.SUPERIOR_SECOND))
            relievedRules.addAll(ClassicalRules.strings(monthly, "relieveOnVictory"));
        var placement = ClassicalRules.placement();
        if (!ClassicalRules.fromAvoid(grade, relief) && hits.stream()
                .anyMatch(hit -> ClassicalRules.strings(placement, "beneficNames").contains(hit.name()))) {
            noAvoid.addAll(ClassicalRules.strings(placement, "noAvoidOnBenefic"));
        }
        for (RuleHit hit : hits) {
            boolean canonical = hit.evidenceLevel().equals(CANONICAL);
            for (String activity : hit.recommends()) {
                evidence.computeIfAbsent(activity, ignored -> new Evidence()).addRecommend(hit.ruleId(), canonical);
            }
            for (String activity : hit.avoids()) {
                evidence.computeIfAbsent(activity, ignored -> new Evidence()).addAvoid(hit.ruleId(), canonical);
            }
        }

        Set<String> preliminary = new LinkedHashSet<>();
        evidence.forEach((activity, value) -> {
            if (!value.canonicalRecommend.isEmpty() && !value.canonicalAvoid.isEmpty()
                    && value.canonicalAvoid.stream().noneMatch(rule -> rule.endsWith("_RETAINED_TABOOS") || rule.equals("OFFICER_破"))
                    && (grade == DayGrade.SUPERIOR || grade == DayGrade.SUPERIOR_SECOND
                    || relief && (grade == MIDDLE || grade == DayGrade.MIDDLE_SECOND))) preliminary.add(activity);
        });
        for (var entry : ClassicalRules.rows(placement, "balancedNoAvoidLinks")) {
            if (preliminary.containsAll(ClassicalRules.strings(entry, "when"))) noAvoid.addAll(ClassicalRules.strings(entry, "also"));
        }

        Set<String> unreconciled = new LinkedHashSet<>();
        evidence.forEach((activity, value) -> {
            boolean retained = !allRelieved && value.canonicalAvoid.stream().anyMatch(id -> id.endsWith("_RETAINED_TABOOS") || id.equals("OFFICER_破"));
            var effective = allRelieved ? List.<String>of() : retained ? value.canonicalAvoid : value.canonicalAvoid.stream().filter(id -> !noAvoid.contains(activity)
                    && !relievedRules.contains(id) && ClassicalRules.rows(placement, "ignoreAvoidRules").stream().noneMatch(entry ->
                    entry.get("ruleId").equals(id) && ClassicalRules.strings(entry, "activities").contains(activity))).toList();
            if (disposition(value.canonicalRecommend, effective, grade, relief, allAvoided, retained, suppressedActivities.contains(activity)) == Disposition.AVOID)
                unreconciled.add(activity);
        });
        for (var link : ClassicalRules.recommendSuppressionLinks()) {
            if (unreconciled.containsAll(ClassicalRules.strings(link, "when"))) suppressedActivities.addAll(ClassicalRules.strings(link, "also"));
        }
        boolean monthAversion = hits.stream().anyMatch(hit -> hit.ruleId().equals("MONTH_AVERSION"));
        hits.stream().filter(hit -> hit.ruleId().equals("PRESSING_PLACEMENT")).forEach(hit -> {
            suppressedActivities.addAll(hit.avoids());
            relievedRules.add(hit.ruleId());
        });
        boolean aversionChangesProclamation = monthAversion && (unreconciled.contains("行幸") || unreconciled.contains("上官赴任"));
        boolean goingLoss = hits.stream().anyMatch(hit -> hit.ruleId().equals("CLASSICAL_RAW_GOING_LOSS"));
        if (aversionChangesProclamation) {
            suppressedActivities.addAll(activities("颁诏,施恩封拜,诏命公卿,招贤,举正直"));
        }
        if (aversionChangesProclamation || goingLoss) {
            Evidence original = evidence.get("宣政事");
            if (original != null && !original.canonicalRecommend.isEmpty()) {
                suppressedActivities.add("宣政事");
                Evidence changed = evidence.computeIfAbsent("布政事", ignored -> new Evidence());
                for (String id : original.canonicalRecommend) changed.addRecommend(id, true);
                for (String id : original.canonicalAvoid) {
                    if (aversionChangesProclamation && id.contains("AVERSION") || goingLoss && id.contains("GOING_LOSS")) continue;
                    changed.addAvoid(id, true);
                }
            }
        } else if (evidence.containsKey("宣政事") && !evidence.get("宣政事").canonicalRecommend.isEmpty()) suppressedActivities.add("布政事");
        if (evidence.containsKey("营建宫室") && !evidence.get("营建宫室").canonicalRecommend.isEmpty()) suppressedActivities.add("修宫室");
        if (hits.stream().anyMatch(hit -> Set.of("CLASSICAL_RAW_FOUR_TABOO", "CLASSICAL_RAW_FOUR_EXHAUSTION").contains(hit.ruleId()))
                && hits.stream().anyMatch(hit -> Set.of("CLASSICAL_RAW_BARKING", "CLASSICAL_RAW_BARKING_OPPOSITE").contains(hit.ruleId()))) {
            suppressedActivities.addAll(activities("破土,启攒"));
        }

        List<String> recommended = new ArrayList<>();
        List<String> avoided = new ArrayList<>();
        List<String> caution = new ArrayList<>();
        List<ActivityDecision> decisions = new ArrayList<>();
        for (var entry : evidence.entrySet()) {
            String activity = entry.getKey();
            Evidence value = entry.getValue();
            boolean hasCanonical = !value.canonicalRecommend.isEmpty() || !value.canonicalAvoid.isEmpty();
            List<String> recommendBy = hasCanonical ? value.canonicalRecommend : value.supplementalRecommend;
            List<String> avoidBy = hasCanonical ? value.canonicalAvoid : value.supplementalAvoid;
            List<String> excluded = hasCanonical
                    ? concat(value.supplementalRecommend, value.supplementalAvoid)
                    : List.of();
            boolean retainedTaboo = !allRelieved && avoidBy.stream().anyMatch(rule -> rule.endsWith("_RETAINED_TABOOS")
                    || rule.equals("OFFICER_破"));
            boolean suppressed = suppressedActivities.contains(activity);
            List<String> effectiveAvoid = allRelieved ? List.of() : retainedTaboo ? avoidBy : avoidBy.stream()
                    .filter(rule -> !noAvoid.contains(activity) && !relievedRules.contains(rule)
                            && ClassicalRules.rows(placement, "ignoreAvoidRules").stream().noneMatch(entryRule ->
                            entryRule.get("ruleId").equals(rule) && ClassicalRules.strings(entryRule, "activities").contains(activity))).toList();
            boolean omittedByNoSalary = hits.stream().anyMatch(hit -> hit.ruleId().equals("CLASSICAL_RAW_NO_SALARY"))
                    && !ClassicalGods.noSalaryAllowed().contains(activity);
            Disposition disposition = omittedByNoSalary ? Disposition.OMITTED : disposition(recommendBy, effectiveAvoid, grade, relief, allAvoided,
                    retainedTaboo, suppressed);
            switch (disposition) {
                case RECOMMENDED -> recommended.add(activity);
                case AVOID -> avoided.add(activity);
                case CAUTION -> caution.add(activity);
                case OMITTED -> {
                    // A canonical special case says not to print this otherwise-favorable activity.
                }
            }
            decisions.add(new ActivityDecision(activity, disposition,
                    !recommendBy.isEmpty() && !avoidBy.isEmpty(), recommendBy, avoidBy, excluded,
                    omittedByNoSalary ? "卷十无禄日仅铺注所列十二类用事，其余不注；不等同一律输出忌。" : effectiveAvoid.size() != avoidBy.size() && !allAvoided
                            ? "卷十逐月解忌或铺注条例不注此忌；原始忌证据保留，不忌不自动生成宜。"
                            : rationale(recommendBy, avoidBy, disposition, grade, relief, allAvoided, hasCanonical,
                            retainedTaboo, suppressed)));
        }

        return new ActivityResult(recommended, avoided, caution, grade, virtue, allAvoided, decisions, hits,
                new ConflictPolicy("《钦定协纪辨方书》六等消解", XIEJI_VOLUME_10,
                        "上从宜；上次逢德从宜、不逢德宜忌并存；中逢德从宜、不逢德从忌；中次逢德宜忌并存、不逢德从忌；下从忌且无德时诸事皆忌；最下不论德神皆诸事忌。",
                        List.of("上", "上次", "中", "中次", "下", "最下"),
                        "原文明列的专忌与组合专例优先；未核定等第返回未定，剩余冲突列宜忌并存，不使用整数加权。月破专忌不得由德神翻为宜。低证据传统只补充主规则空白。"));
    }

    private Disposition disposition(List<String> recommends, List<String> avoids, DayGrade grade,
                                    boolean virtue, boolean allAvoided, boolean retainedTaboo,
                                    boolean suppressed) {
        if (allAvoided) {
            return Disposition.AVOID;
        }
        if (retainedTaboo) {
            return Disposition.AVOID;
        }
        if (suppressed) {
            return avoids.isEmpty() ? Disposition.OMITTED : Disposition.AVOID;
        }
        if (recommends.isEmpty()) {
            return avoids.isEmpty() ? Disposition.OMITTED : Disposition.AVOID;
        }
        if (avoids.isEmpty()) {
            return Disposition.RECOMMENDED;
        }
        return switch (grade) {
            case SUPERIOR -> Disposition.RECOMMENDED;
            case SUPERIOR_SECOND -> virtue ? Disposition.RECOMMENDED : Disposition.CAUTION;
            case MIDDLE -> virtue ? Disposition.RECOMMENDED : Disposition.AVOID;
            case MIDDLE_SECOND -> virtue ? Disposition.CAUTION : Disposition.AVOID;
            case INFERIOR, LOWEST -> Disposition.AVOID;
            case UNDETERMINED -> Disposition.CAUTION;
        };
    }

    private String rationale(List<String> recommends, List<String> avoids, Disposition disposition,
                             DayGrade grade, boolean virtue, boolean allAvoided, boolean canonical,
                             boolean retainedTaboo, boolean suppressed) {
        if (allAvoided) {
            return "日等为" + grade.classicalName() + "，按六等表归入诸事皆忌。";
        }
        if (retainedTaboo) {
            return "卷十制化专例明确保留此忌，优先于通用六等冲突表。";
        }
        if (suppressed) {
            return avoids.isEmpty() ? "卷十专例规定不注宜，故不输出到宜项。" : "卷十专例先撤销宜项，再采用其余忌项。";
        }
        if (recommends.isEmpty() || avoids.isEmpty()) {
            return canonical ? "官修主规则只有单向结论，直接采用。" : "官修主规则未裁定，由低等级传统补充。";
        }
        if (grade == DayGrade.UNDETERMINED) {
            return "未命中已核定等第专例，保留双方原始宜忌，不以数字加权推定古籍日等。";
        }
        return "官修规则发生冲突；日等=" + grade.classicalName() + "，德神=" + (virtue ? "有" : "无")
                + "，依六等表裁为" + disposition + "。";
    }

    private DayGrade grade(List<RuleHit> hits, Cycle month) {
        if (hits.stream().anyMatch(hit -> hit.ruleId().equals("MONTH_BREAK_ABSOLUTE_RETAINED_TABOOS"))) return LOWEST;
        if (hits.stream().anyMatch(hit -> hit.ruleId().equals("DISASTER_SHA_RETAINED_TABOOS"))) {
            return MIDDLE;
        }
        boolean monthSha = hits.stream().anyMatch(hit -> hit.ruleId().equals("MONTH_SHA"));
        boolean exhaustedOfficer = hits.stream()
                .anyMatch(hit -> Set.of("OFFICER_平", "OFFICER_闭").contains(hit.ruleId()));
        if (monthSha && exhaustedOfficer) {
            return INFERIOR;
        }
        boolean monthBreak = hits.stream().anyMatch(hit -> hit.ruleId().equals("OFFICER_破"));
        if (monthBreak && Set.of(3, 9).contains(month.branchIndex())) {
            return LOWEST;
        }
        if (monthBreak && Set.of(0, 6, 7, 8).contains(month.branchIndex())) {
            return INFERIOR;
        }
        // The electronic transcription omits the grade table. Do not invent grades by adding scores.
        return DayGrade.UNDETERMINED;
    }

    private RuleHit hit(RuleSpec spec, String matchedBecause) {
        return new RuleHit(spec.id(), spec.name(), "建除十二神", XIEJI_VOLUME_10, CANONICAL,
                spec.recommends(), spec.avoids(), matchedBecause, spec.note());
    }

    private static Map<String, RuleSpec> officerRules() {
        Map<String, RuleSpec> rules = new LinkedHashMap<>();
        rules.put("建", spec("建", "施恩封拜,诏命公卿,招贤,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
                "祈福,求嗣,上册进表章,结婚姻,纳采问名,解除,整容,剃头,整手足甲,求医,疗病,营建宫室,修宫室," +
                        "缮城郭,兴造动土,竖柱上梁,修仓库,开仓库,出货财,修置产室,破屋,坏垣,伐木,栽种,破土,安葬,启攒",
                "建为月主，叠吉则吉、叠凶则凶；土府类土工专忌。"));
        rules.put("除", spec("除", "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇,施恩封拜,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
                "", "除旧布新；并取吉期、兵宝。"));
        rules.put("满", spec("满", "进人口,裁制,修仓库,经络,开市,立券,交易,纳财,开仓库,出货财,补垣,塞穴,祭祀,祈福,上册进表章,庆赐赏贺,宴会,修宫室,缮城郭",
                "施恩封拜,诏命公卿,招贤,举正直,上官赴任,临政亲民,结婚姻,纳采问名,求医,疗病",
                    "卷四引旧说天巫宜合药请医；卷十满日按语明确删除该医疗宜项，以满日所忌为准。"));
        rules.put("平", spec("平", "修饰垣墙,平治道涂",
                "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                        "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除,求医,疗病," +
                        "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财," +
                        "开仓库,出货财,修置产室,开渠,穿井,栽种,牧养,纳畜,破土,安葬,启攒",
                "平日为月建阴气既尽，凶次于月破。"));
        rules.put("定", spec("定", "冠带,运谋算画,计策", "", "定为三合之中，取方中未昃之义。"));
        rules.put("执", spec("执", "捕捉", "", "执取捕捉；畋猎、取鱼另受节令条件约束。"));
        rules.put("破", new RuleSpec("OFFICER_破", "破日",
                activities("求医,疗病,破屋,坏垣"), MONTH_BREAK_AVOIDS,
                "月破为月建之冲与气绝之地，德神临此亦不能普遍解忌。"));
        rules.put("危", spec("危", "安抚边境,选将,训兵,安床", "", "危日取安为义；伐木畋猎取鱼另受节令约束。"));
        rules.put("成", spec("成", "入学,安抚边境,搬移,筑堤防,开市,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民," +
                        "结婚姻,纳采问名,嫁娶,求医,疗病",
                "", "成为合局之终；兼天喜、天医。"));
        rules.put("收", spec("收", "进人口,纳财,捕捉,纳畜",
                "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                        "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,搬移,安床,解除,求医,疗病," +
                        "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,鼓铸,经络,酝酿,开市,立券,交易," +
                        "开仓库,出货财,修置产室,开渠,穿井,破土,安葬,启攒",
                "收取诸收，但阳气既尽，宜忌须综合德神与他煞。"));
        rules.put("开", spec("开", "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独," +
                        "宣政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,入学,行幸,遣使,上官赴任,临政亲民,搬移,解除," +
                        "求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,开市,修置产室,开渠,穿井,安碓硙,栽种,牧养",
                "伐木,畋猎,取鱼,破土,安葬,启攒", "开日一阳始生，卷十称其日最吉。"));
        rules.put("闭", spec("闭", "筑堤防,补垣,塞穴",
                "上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,行幸,遣使,出师," +
                        "上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,求医,疗病,营建宫室,修宫室," +
                        "兴造动土,竖柱上梁,开市,开仓库,出货财,修置产室,开渠,穿井,针刺",
                "闭取敛息之义；血支专忌针刺。"));
        return Map.copyOf(rules);
    }

    private static RuleSpec spec(String officer, String recommends, String avoids, String note) {
        return new RuleSpec("OFFICER_" + officer, officer + "日",
                activities(recommends), activities(avoids), note);
    }

    private static List<String> activities(String commaSeparated) {
        if (commaSeparated == null || commaSeparated.isBlank()) {
            return List.of();
        }
        return List.of(commaSeparated.split(","));
    }

    private static List<String> concat(List<String> first, List<String> second) {
        LinkedHashSet<String> values = new LinkedHashSet<>(first);
        values.addAll(second);
        return List.copyOf(values);
    }

    private record RuleSpec(
            String id,
            String name,
            List<String> recommends,
            List<String> avoids,
            String note) {
    }

    private static final class Evidence {
        private final List<String> canonicalRecommend = new ArrayList<>();
        private final List<String> canonicalAvoid = new ArrayList<>();
        private final List<String> supplementalRecommend = new ArrayList<>();
        private final List<String> supplementalAvoid = new ArrayList<>();

        void addRecommend(String rule, boolean canonical) {
            (canonical ? canonicalRecommend : supplementalRecommend).add(rule);
        }

        void addAvoid(String rule, boolean canonical) {
            (canonical ? canonicalAvoid : supplementalAvoid).add(rule);
        }
    }
}
