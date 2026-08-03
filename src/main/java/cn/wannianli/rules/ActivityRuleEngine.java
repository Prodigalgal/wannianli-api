package cn.wannianli.rules;

import static cn.wannianli.rules.ActivityResult.DayGrade.INFERIOR;
import static cn.wannianli.rules.ActivityResult.DayGrade.LOWEST;
import static cn.wannianli.rules.ActivityResult.DayGrade.MIDDLE;
import static cn.wannianli.rules.ActivityResult.DayGrade.MIDDLE_SECOND;
import static cn.wannianli.rules.ActivityResult.DayGrade.SUPERIOR;
import static cn.wannianli.rules.ActivityResult.DayGrade.SUPERIOR_SECOND;

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
    private static final String CANONICAL = "A_IMPERIAL_CANON";
    private static final String TRANSMITTED = "C_TRADITIONAL_TRANSMISSION";

    private static final List<String> VIRTUE_RECOMMENDS = activities(
            "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事," +
                    "行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,出师,上官赴任,临政亲民," +
                    "结婚姻,纳采问名,嫁娶,搬移,解除,求医,疗病,裁制,营建宫室,缮城郭,兴造动土,竖柱上梁,修仓库,栽种,牧养,纳畜,安葬");
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
    private static final String[] STEM_ACTIVITY = {"开仓库", "栽种", "修灶", "剃头", "受田", "破券", "经络", "合酱", "汲水", "词讼"};
    private static final String[] BRANCH_ACTIVITY = {"问卜", "冠带", "祭祀", "穿井", "哭泣", "远行", "苫盖", "服药", "安床", "会客", "食犬", "嫁娶"};

    public ActivityResult evaluate(LocalDate date, Cycle month, Cycle day, TraditionalAlmanac almanac) {
        List<RuleHit> hits = new ArrayList<>();
        RuleSpec officer = OFFICER_RULES.get(almanac.dayOfficer().name());
        hits.add(hit(officer, "日支与节月月支推得" + almanac.dayOfficer().name() + "日"));
        addAuspiciousGodRules(hits, almanac);
        addInauspiciousGodRules(hits, month, almanac);
        hits.add(new RuleHit("DUTY_GOD_" + almanac.dutyGod().name(), almanac.dutyGod().name(), "黄黑道十二值神",
                "XIEJI_BIANFANGSHU_VOLUME_7", CANONICAL, 0, 0, List.of(), List.of(),
                "当日值" + almanac.dutyGod().name() + "，属" + almanac.dutyGod().path(),
                "卷十明言六黄道、六黑道无专宜专忌；仅作吉凶背景，不机械生成活动。"));
        hits.add(supplemental("PENGZU_STEM_" + day.name(), "彭祖百忌·天干", STEM_ACTIVITY[day.stemIndex()],
                almanac.pengZu().heavenlyStemRule()));
        hits.add(supplemental("PENGZU_BRANCH_" + day.name(), "彭祖百忌·地支", BRANCH_ACTIVITY[day.branchIndex()],
                almanac.pengZu().earthlyBranchRule()));

        DayGrade grade = grade(hits);
        boolean allAvoided = grade == LOWEST || (grade == INFERIOR && !almanac.gods().virtuePresent());
        return resolve(hits, grade, almanac.gods().virtuePresent(), allAvoided);
    }

    private void addAuspiciousGodRules(List<RuleHit> hits, TraditionalAlmanac almanac) {
        for (String god : almanac.gods().auspicious()) {
            switch (god) {
                case "天德", "月德", "天德合", "月德合" -> hits.add(new RuleHit(
                        "VIRTUE_" + god, god, "吉神", XIEJI_VOLUME_10, CANONICAL, 3, 0,
                        VIRTUE_RECOMMENDS, activities("畋猎,取鱼"), "命中" + god + "起例",
                        "卷十列为上吉；忌畋猎取鱼以免伤生气。"));
                case "天赦" -> hits.add(new RuleHit(
                        "HEAVENLY_PARDON", "天赦", "吉神", XIEJI_VOLUME_10, CANONICAL, 3, 0,
                        VIRTUE_RECOMMENDS, activities("畋猎,取鱼"), "命中四时天赦干支",
                        "天地合德、四时旺辰，能解诸凶；不用于出师。"));
                case "母仓" -> hits.add(new RuleHit(
                        "MATERNAL_STOREHOUSE", "母仓", "吉神", XIEJI_VOLUME_10, CANONICAL, 1, 0,
                        activities("纳财,栽种,牧养,纳畜"), List.of(), "命中四时母仓日支",
                        "卷五起例、卷十宜忌。"));
                case "三合" -> hits.add(new RuleHit(
                        "THREE_HARMONY", "三合", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
                        activities("庆赐赏贺,宴会,结婚姻,纳采问名,嫁娶,进人口,裁制,修宫室,缮城郭,兴造动土," +
                                "竖柱上梁,修仓库,经络,酝酿,立券,交易,纳财,安碓硙,纳畜"),
                        List.of(), "日支与月建构成三合", "卷十称三合为日之吉者所重。"));
                case "六合" -> hits.add(new RuleHit(
                        "SIX_HARMONY", "六合", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
                        activities("宴会,结婚姻,嫁娶,进人口,经络,酝酿,立券,交易,纳财,纳畜,安葬"),
                        List.of(), "日支与月建六合", "卷十称六合之吉不减三合。"));
                default -> {
                    // Officer aliases are already incorporated in the officer's canonical rule.
                }
            }
        }
    }

    private void addInauspiciousGodRules(List<RuleHit> hits, Cycle month, TraditionalAlmanac almanac) {
        Set<String> bad = Set.copyOf(almanac.gods().inauspicious());
        if (bad.contains("劫煞")) {
            hits.add(severe("ROBBERY_SHA", "劫煞", 2, THREE_SHA_AVOIDS, "命中月建三合绝地"));
        }
        if (bad.contains("灾煞")) {
            boolean canonicalRelief = almanac.gods().virtuePresent()
                    && almanac.dayOfficer().name().equals("满")
                    && Set.of(1, 4, 7, 10).contains(month.branchIndex());
            List<String> avoids = canonicalRelief ? LIMITED_SEVERE_AVOIDS : THREE_SHA_AVOIDS;
            String ruleId = canonicalRelief ? "DISASTER_SHA_RETAINED_TABOOS" : "DISASTER_SHA";
            hits.add(new RuleHit(ruleId, "灾煞", "凶煞", XIEJI_VOLUME_10, CANONICAL,
                    0, 3, List.of(), avoids, "命中月建三合正冲",
                    canonicalRelief
                            ? "卷十专例：辰戌丑未月满日与德神并，止忌军事及求医疗病，其余不忌。"
                            : "灾煞所忌同劫煞；天火另忌苫盖。"));
            if (!canonicalRelief) {
                hits.add(new RuleHit("HEAVENLY_FIRE", "天火", "凶煞", XIEJI_VOLUME_10, CANONICAL,
                        0, 1, List.of(), activities("苫盖"), "灾煞同位天火", "卷十专忌苫盖。"));
            }
        }
        if (bad.contains("月煞")) {
            List<String> avoids = new ArrayList<>(THREE_SHA_AVOIDS);
            avoids.addAll(activities("开仓库,出货财"));
            hits.add(severe("MONTH_SHA", "月煞", 3, avoids, "命中月建三合尽地"));
        }
        if (bad.contains("月害")) {
            hits.add(new RuleHit("MONTH_HARM", "月害", "凶煞", XIEJI_VOLUME_10, CANONICAL,
                    0, 1, List.of(), activities("祈福,求嗣,上册进表章,庆赐赏贺,宴会,安抚边境,选将,训兵,出师," +
                            "结婚姻,纳采问名,嫁娶,进人口,求医,疗病,修仓库,经络,酝酿,开市,立券,交易,纳财," +
                            "开仓库,出货财,修置产室,牧养,纳畜,破土,安葬,启攒"),
                    "日支冲月建六合之支", "卷十称月害之凶轻于刑煞，但非德不可解。"));
        }
    }

    private RuleHit severe(String id, String name, int strength, List<String> avoids, String match) {
        return new RuleHit(id, name, "凶煞", XIEJI_VOLUME_10, CANONICAL, 0, strength,
                List.of(), avoids, match, "按卷十逐项宜忌及六等制化处理。" );
    }

    private RuleHit supplemental(String id, String name, String activity, String text) {
        return new RuleHit(id, name, "传统附加禁忌", "YUXIAJI_TRADITION", TRANSMITTED,
                0, 0, List.of(), List.of(activity), text,
                "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。" );
    }

    private ActivityResult resolve(List<RuleHit> hits, DayGrade grade, boolean virtue, boolean allAvoided) {
        Map<String, Evidence> evidence = new LinkedHashMap<>();
        for (RuleHit hit : hits) {
            boolean canonical = hit.evidenceLevel().equals(CANONICAL);
            for (String activity : hit.recommends()) {
                evidence.computeIfAbsent(activity, ignored -> new Evidence()).addRecommend(hit.ruleId(), canonical);
            }
            for (String activity : hit.avoids()) {
                evidence.computeIfAbsent(activity, ignored -> new Evidence()).addAvoid(hit.ruleId(), canonical);
            }
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
            boolean retainedTaboo = avoidBy.stream().anyMatch(rule -> rule.endsWith("_RETAINED_TABOOS"));
            Disposition disposition = disposition(recommendBy, avoidBy, grade, virtue, allAvoided, retainedTaboo);
            switch (disposition) {
                case RECOMMENDED -> recommended.add(activity);
                case AVOID -> avoided.add(activity);
                case CAUTION -> caution.add(activity);
            }
            decisions.add(new ActivityDecision(activity, disposition,
                    !recommendBy.isEmpty() && !avoidBy.isEmpty(), recommendBy, avoidBy, excluded,
                    rationale(recommendBy, avoidBy, disposition, grade, virtue, allAvoided, hasCanonical, retainedTaboo)));
        }

        return new ActivityResult(recommended, avoided, caution, grade, virtue, allAvoided, decisions, hits,
                new ConflictPolicy("《钦定协纪辨方书》六等消解", XIEJI_VOLUME_10,
                        "上从宜；上次逢德从宜、不逢德宜忌并存；中逢德从宜、不逢德从忌；中次逢德宜忌并存、不逢德从忌；下从忌且无德时诸事皆忌；最下不论德神皆诸事忌。",
                        List.of("上", "上次", "中", "中次", "下", "最下"),
                        "低证据传统只补充官修主规则未裁定的活动，不参与反向覆盖。"));
    }

    private Disposition disposition(List<String> recommends, List<String> avoids, DayGrade grade,
                                    boolean virtue, boolean allAvoided, boolean retainedTaboo) {
        if (allAvoided) {
            return Disposition.AVOID;
        }
        if (retainedTaboo) {
            return Disposition.AVOID;
        }
        if (recommends.isEmpty()) {
            return Disposition.AVOID;
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
        };
    }

    private String rationale(List<String> recommends, List<String> avoids, Disposition disposition,
                             DayGrade grade, boolean virtue, boolean allAvoided, boolean canonical,
                             boolean retainedTaboo) {
        if (allAvoided) {
            return "日等为" + grade.classicalName() + "，按六等表归入诸事皆忌。";
        }
        if (retainedTaboo) {
            return "卷十制化专例明确保留此忌，优先于通用六等冲突表。";
        }
        if (recommends.isEmpty() || avoids.isEmpty()) {
            return canonical ? "官修主规则只有单向结论，直接采用。" : "官修主规则未裁定，由低等级传统补充。";
        }
        return "官修规则发生冲突；日等=" + grade.classicalName() + "，德神=" + (virtue ? "有" : "无")
                + "，依六等表裁为" + disposition + "。";
    }

    private DayGrade grade(List<RuleHit> hits) {
        boolean monthBreak = hits.stream().anyMatch(hit -> hit.ruleId().equals("OFFICER_破"));
        boolean severeSha = hits.stream().anyMatch(hit -> Set.of("DISASTER_SHA", "MONTH_SHA").contains(hit.ruleId()));
        if (monthBreak && severeSha) {
            return LOWEST;
        }
        int good = hits.stream().filter(hit -> hit.evidenceLevel().equals(CANONICAL))
                .mapToInt(RuleHit::favorableStrength).sum();
        int bad = hits.stream().filter(hit -> hit.evidenceLevel().equals(CANONICAL))
                .mapToInt(RuleHit::unfavorableStrength).sum();
        int difference = good - bad;
        if (difference >= 3) {
            return SUPERIOR;
        }
        if (difference >= 1) {
            return SUPERIOR_SECOND;
        }
        if (difference == 0) {
            return MIDDLE;
        }
        if (difference >= -2) {
            return MIDDLE_SECOND;
        }
        return INFERIOR;
    }

    private RuleHit hit(RuleSpec spec, String matchedBecause) {
        return new RuleHit(spec.id(), spec.name(), "建除十二神", XIEJI_VOLUME_10, CANONICAL,
                spec.goodStrength(), spec.badStrength(), spec.recommends(), spec.avoids(), matchedBecause, spec.note());
    }

    private static Map<String, RuleSpec> officerRules() {
        Map<String, RuleSpec> rules = new LinkedHashMap<>();
        rules.put("建", spec("建", 1, 1,
                "施恩封拜,诏命公卿,招贤,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
                "祈福,求嗣,上册进表章,结婚姻,纳采问名,解除,整容,剃头,整手足甲,求医,疗病,营建宫室,修宫室," +
                        "缮城郭,兴造动土,竖柱上梁,修仓库,开仓库,出货财,修置产室,破屋,坏垣,伐木,栽种,破土,安葬,启攒",
                "建为月主，叠吉则吉、叠凶则凶；土府类土工专忌。"));
        rules.put("除", spec("除", 1, 0,
                "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇,施恩封拜,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
                "", "除旧布新；并取吉期、兵宝。"));
        rules.put("满", spec("满", 1, 1,
                "进人口,裁制,修仓库,经络,开市,立券,交易,纳财,开仓库,出货财,补垣,塞穴,祭祀,祈福,上册进表章,庆赐赏贺,宴会,修宫室,缮城郭",
                "施恩封拜,诏命公卿,招贤,举正直,上官赴任,临政亲民,结婚姻,纳采问名,求医,疗病",
                "满取丰豫之义；兼天巫、福德，盈气所忌另列。"));
        rules.put("平", spec("平", 1, 2, "修饰垣墙,平治道涂",
                "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                        "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除,求医,疗病," +
                        "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财," +
                        "开仓库,出货财,修置产室,开渠,穿井,栽种,牧养,纳畜,破土,安葬,启攒",
                "平日为月建阴气既尽，凶次于月破。"));
        rules.put("定", spec("定", 1, 0, "冠带,运谋算画,计策", "", "定为三合之中，取方中未昃之义。"));
        rules.put("执", spec("执", 1, 0, "捕捉", "", "执取捕捉；畋猎、取鱼另受节令条件约束。"));
        rules.put("破", new RuleSpec("OFFICER_破", "破日", 1, 3,
                activities("求医,疗病,破屋,坏垣"), MONTH_BREAK_AVOIDS,
                "月破为月建之冲与气绝之地，德神临此亦不能普遍解忌。"));
        rules.put("危", spec("危", 1, 0, "安抚边境,选将,训兵,安床", "", "危日取安为义；伐木畋猎取鱼另受节令约束。"));
        rules.put("成", spec("成", 2, 0,
                "入学,安抚边境,搬移,筑堤防,开市,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民," +
                        "结婚姻,纳采问名,嫁娶,求医,疗病",
                "", "成为合局之终；兼天喜、天医。"));
        rules.put("收", spec("收", 1, 2, "进人口,纳财,捕捉,纳畜",
                "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
                        "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,搬移,安床,解除,求医,疗病," +
                        "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,鼓铸,经络,酝酿,开市,立券,交易," +
                        "开仓库,出货财,修置产室,开渠,穿井,破土,安葬,启攒",
                "收取诸收，但阳气既尽，宜忌须综合德神与他煞。"));
        rules.put("开", spec("开", 3, 1,
                "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独," +
                        "宣政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,入学,行幸,遣使,上官赴任,临政亲民,搬移,解除," +
                        "求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,开市,修置产室,开渠,穿井,安碓硙,栽种,牧养",
                "伐木,畋猎,取鱼,破土,安葬,启攒", "开日一阳始生，卷十称其日最吉。"));
        rules.put("闭", spec("闭", 1, 2, "筑堤防,补垣,塞穴",
                "上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,行幸,遣使,出师," +
                        "上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,求医,疗病,营建宫室,修宫室," +
                        "兴造动土,竖柱上梁,开市,开仓库,出货财,修置产室,开渠,穿井,针刺",
                "闭取敛息之义；血支专忌针刺。"));
        return Map.copyOf(rules);
    }

    private static RuleSpec spec(String officer, int good, int bad, String recommends, String avoids, String note) {
        return new RuleSpec("OFFICER_" + officer, officer + "日", good, bad,
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
            int goodStrength,
            int badStrength,
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
