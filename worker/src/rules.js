import { monthlyCase, placement, placementSets, absoluteCase, recommendSuppressionLinks, pressingCase, universalRelief } from "./classical.js";
import { coreGodHits, aversionAvoids, noSalaryAllowed } from "./god-rules.js";
import { calendarAnnotationOmissions } from "./calendar-day-rules.js";

const CANONICAL = "B_PRIMARY_TEXT_TRANSCRIPTION";
const TRANSMITTED = "C_TRADITIONAL_TRANSMISSION";
const XIEJI_VOLUME_10 = "XIEJI_BIANFANGSHU_VOLUME_10";

const activities = (value) => value ? value.split(",") : [];
const VIRTUE_RECOMMENDS = activities(
  "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事," +
  "行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,出师,上官赴任,临政亲民," +
  "结婚姻,纳采问名,嫁娶,搬移,解除,求医,疗病,裁制,营建宫室,缮城郭,兴造动土,竖柱上梁,修仓库,栽种,牧养,纳畜,安葬",
);
const HEAVENLY_PARDON_RECOMMENDS = VIRTUE_RECOMMENDS.filter((activity) => activity !== "出师");
const HEAVENLY_GRACE_RECOMMENDS = activities("覃恩,肆赦,施恩惠恤孤独,布政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会");
const SEASONAL_VIRTUE_RECOMMENDS = activities(
  "祭祀,祈福,求嗣,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民," +
  "结婚姻,纳采问名,搬移,解除,求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,纳财,开仓库,出货财,栽种,牧养",
);
const ROYAL_DAY_RECOMMENDS = activities(
  "颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事,行惠爱," +
  "雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,上官赴任,临政亲民,裁制",
);
const OFFICE_DAY_RECOMMENDS = activities("袭爵受封,上官赴任,临政亲民");
const GUARDING_DAY_RECOMMENDS = activities("袭爵受封,上官赴任,临政亲民,安抚边境");
const PEOPLE_DAY_RECOMMENDS = activities("宴会,结婚姻,纳采问名,进人口,搬移,开市,立券,交易,纳财,栽种,牧养,纳畜");
const THREE_SHA_AVOIDS = activities(
  "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
  "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除," +
  "整容,剃头,整手足甲,求医,疗病,裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁," +
  "修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,开渠,穿井,安碓硙," +
  "补垣,塞穴,修饰垣墙,破屋,坏垣,栽种,牧养,纳畜,破土,安葬,启攒",
);
const MONTH_BREAK_AVOIDS = activities(
  "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
  "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,整容," +
  "剃头,整手足甲,裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络," +
  "酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,开渠,穿井,安碓硙,补垣,塞穴,修饰垣墙," +
  "伐木,栽种,牧养,纳畜,破土,安葬,启攒",
);
const LIMITED_SEVERE_AVOIDS = activities("安抚边境,选将,训兵,出师,求医,疗病");
const STEM_ACTIVITY = ["开仓库", "栽种", "修灶", "剃头", "受田", "破券", "经络", "合酱", "决水", "词论"];
const BRANCH_ACTIVITY = ["问卜", "冠带", "祭祀", "穿井", "哭泣", "远行", "苫盖", "服药", "安床", "会客", "食犬", "嫁娶"];

function spec(name, recommends, avoids, note) {
  return { id: `OFFICER_${name}`, name: `${name}日`, recommends: activities(recommends), avoids: activities(avoids), note };
}

const OFFICER_RULES = new Map([
  ["建", spec("建", "施恩封拜,诏命公卿,招贤,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
    "祈福,求嗣,上册进表章,结婚姻,纳采问名,解除,整容,剃头,整手足甲,求医,疗病,营建宫室,修宫室,缮城郭,兴造动土,竖柱上梁,修仓库,开仓库,出货财,修置产室,破屋,坏垣,伐木,栽种,破土,安葬,启攒",
    "建为月主，叠吉则吉、叠凶则凶；土府类土工专忌。")],
  ["除", spec("除", "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇,施恩封拜,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
    "", "除旧布新；并取吉期、兵宝。")],
  ["满", spec("满", "进人口,裁制,修仓库,经络,开市,立券,交易,纳财,开仓库,出货财,补垣,塞穴,祭祀,祈福,上册进表章,庆赐赏贺,宴会,修宫室,缮城郭",
    "施恩封拜,诏命公卿,招贤,举正直,上官赴任,临政亲民,结婚姻,纳采问名,求医,疗病",
    "卷四引旧说天巫宜合药请医；卷十满日按语明确删除该医疗宜项，以满日所忌为准。")],
  ["平", spec("平", "修饰垣墙,平治道涂",
    "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除,求医,疗病," +
    "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财," +
    "开仓库,出货财,修置产室,开渠,穿井,栽种,牧养,纳畜,破土,安葬,启攒",
    "平日为月建阴气既尽，凶次于月破。")],
  ["定", spec("定", "冠带,运谋算画,计策", "", "定为三合之中，取方中未昃之义。")],
  ["执", spec("执", "捕捉", "", "执取捕捉；畋猎、取鱼另受节令条件约束。")],
  ["破", { id: "OFFICER_破", name: "破日", recommends: activities("求医,疗病,破屋,坏垣"), avoids: MONTH_BREAK_AVOIDS,
    note: "月破为月建之冲与气绝之地，德神临此亦不能普遍解忌。" }],
  ["危", spec("危", "安抚边境,选将,训兵,安床", "", "危日取安为义；伐木畋猎取鱼另受节令约束。")],
  ["成", spec("成", "入学,安抚边境,搬移,筑堤防,开市,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,求医,疗病",
    "", "成为合局之终；兼天喜、天医。")],
  ["收", spec("收", "进人口,纳财,捕捉,纳畜",
    "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,搬移,安床,解除,求医,疗病," +
    "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,鼓铸,经络,酝酿,开市,立券,交易," +
    "开仓库,出货财,修置产室,开渠,穿井,破土,安葬,启攒",
    "收取诸收，但阳气既尽，宜忌须综合德神与他煞。")],
  ["开", spec("开", "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独," +
    "宣政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,入学,行幸,遣使,上官赴任,临政亲民,搬移,解除," +
    "求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,开市,修置产室,开渠,穿井,安碓硙,栽种,牧养",
    "伐木,畋猎,取鱼,破土,安葬,启攒", "开日一阳始生，卷十称其日最吉。")],
  ["闭", spec("闭", "筑堤防,补垣,塞穴",
    "上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,行幸,遣使,出师," +
    "上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,求医,疗病,营建宫室,修宫室," +
    "兴造动土,竖柱上梁,开市,开仓库,出货财,修置产室,开渠,穿井,针刺",
    "闭取敛息之义；血支专忌针刺。")],
]);

function ruleHit(ruleId, name, category, sourceId, evidenceLevel, recommends, avoids, matchedBecause, note) {
  return { ruleId, name, category, sourceId, evidenceLevel, recommends, avoids, matchedBecause, note };
}

function officerHit(value, matchedBecause) {
  return ruleHit(value.id, value.name, "建除十二神", XIEJI_VOLUME_10, CANONICAL,
    value.recommends, value.avoids, matchedBecause, value.note);
}

function severe(id, name, avoids, matchedBecause) {
  return ruleHit(id, name, "凶煞", XIEJI_VOLUME_10, CANONICAL, [], avoids,
    matchedBecause, "按卷十逐项宜忌及六等制化处理。");
}

function addAuspiciousGodRules(hits, almanac) {
  for (const god of almanac.gods.auspicious) {
    if (["天德", "月德", "天德合", "月德合"].includes(god)) {
      hits.push(ruleHit(`VIRTUE_${god}_RETAINED_TABOOS`, god, "吉神", XIEJI_VOLUME_10, CANONICAL, VIRTUE_RECOMMENDS, activities("畋猎,取鱼"), `命中${god}起例`, "卷十列为上吉；忌畋猎取鱼以免伤生气。"));
    } else if (god === "天赦") {
      hits.push(ruleHit("HEAVENLY_PARDON_RETAINED_TABOOS", "天赦", "吉神", XIEJI_VOLUME_10, CANONICAL, HEAVENLY_PARDON_RECOMMENDS, activities("畋猎,取鱼"), "命中四时天赦干支", "天地合德、四时旺辰，能解诸凶；不用于出师。"));
    } else if (god === "天恩") {
      hits.push(ruleHit("HEAVENLY_GRACE", "天恩", "吉神", XIEJI_VOLUME_10, CANONICAL, HEAVENLY_GRACE_RECOMMENDS, [], "命中六十甲子天恩日段", "卷五起例、卷十逐项用事。"));
    } else if (["月恩", "四相", "时德"].includes(god)) {
      const ids = { "月恩": "MONTH_GRACE", "四相": "FOUR_PHASES", "时德": "SEASONAL_VIRTUE" };
      hits.push(ruleHit(ids[god], god, "吉神", XIEJI_VOLUME_10, CANONICAL, SEASONAL_VIRTUE_RECOMMENDS, [], `命中四时${god}起例`, "卷五起例、卷十将月恩、四相、时德合列用事。"));
    } else if (god === "王日") {
      hits.push(ruleHit("ROYAL_DAY", "王日", "吉神", XIEJI_VOLUME_10, CANONICAL, ROYAL_DAY_RECOMMENDS, [], "命中四时王日支", "卷五校订起例、卷十逐项用事。"));
    } else if (["官日", "相日"].includes(god)) {
      hits.push(ruleHit(god === "官日" ? "OFFICIAL_DAY" : "ASSISTING_DAY", god, "吉神",
        XIEJI_VOLUME_10, CANONICAL, OFFICE_DAY_RECOMMENDS, [], `命中四时${god}支`, "卷五校订起例、卷十逐项用事。"));
    } else if (god === "守日") {
      hits.push(ruleHit("GUARDING_DAY", "守日", "吉神", XIEJI_VOLUME_10, CANONICAL, GUARDING_DAY_RECOMMENDS, [], "命中四时守日支", "卷五校订起例、卷十逐项用事。"));
    } else if (god === "民日") {
      hits.push(ruleHit("PEOPLE_DAY", "民日", "吉神", XIEJI_VOLUME_10, CANONICAL, PEOPLE_DAY_RECOMMENDS, [], "命中四时民日支", "卷五校订起例、卷十逐项用事。"));
    } else if (god === "母仓") {
      hits.push(ruleHit("MATERNAL_STOREHOUSE", "母仓", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("纳财,栽种,牧养,纳畜"), [], "命中四时母仓日支", "卷五起例、卷十宜忌。"));
    } else if (god === "月空") {
      hits.push(ruleHit("MONTH_EMPTY", god, "吉神", XIEJI_VOLUME_10, CANONICAL, ["上册进表章"], [], "卷五月德对干", "卷十月空宜上表章；活动词规范为上册进表章。"));
    } else if (god === "天愿") {
      hits.push(ruleHit("HEAVENLY_WISH", god, "吉神", XIEJI_VOLUME_10, CANONICAL,
        [...VIRTUE_RECOMMENDS.filter(a => !["出师", "解除", "求医", "疗病"].includes(a)), ...activities("进人口,经络,酝酿,开市,立券,交易,纳财")], [],
        "卷五最终校订十二月天愿干支", "卷十天愿所宜；不用出师、解除疗病。"));
    } else if (god === "解神" || god === "除神") {
      hits.push(ruleHit(god === "解神" ? "RELEASING_GOD" : "REMOVING_GOD", god, "吉神", XIEJI_VOLUME_10, CANONICAL,
        activities(god === "解神" ? "上册进表章,陈词讼,解除,沐浴,整容,剃头,整手足甲,求医,疗病" : "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇"), [],
        "卷五日神起例", "卷十逐项用事；上表章规范为上册进表章。"));
    } else if (god === "五合") {
      hits.push(ruleHit("FIVE_HARMONY", god, "吉神", XIEJI_VOLUME_10, CANONICAL, activities("宴会,结婚姻,立券,交易"), [], "寅卯日", "卷十五合所宜；不推广为嫁娶。"));
    } else if (god === "三合") {
      hits.push(ruleHit("THREE_HARMONY", "三合", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("庆赐赏贺,宴会,结婚姻,纳采问名,嫁娶,进人口,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,修仓库,经络,酝酿,立券,交易,纳财,安碓硙,纳畜"),
        [], "日支与月建构成三合", "卷十称三合为日之吉者所重。"));
    } else if (god === "六合") {
      hits.push(ruleHit("SIX_HARMONY", "六合", "吉神", XIEJI_VOLUME_10, CANONICAL, activities("宴会,结婚姻,嫁娶,进人口,经络,酝酿,立券,交易,纳财,纳畜,安葬"),
        [], "日支与月建六合", "卷十称六合之吉不减三合。"));
    }
  }
}

function addInauspiciousGodRules(hits, month, almanac) {
  const bad = new Set(almanac.gods.inauspicious);
  if (bad.has("五离")) {
    const relieved = almanac.gods.auspicious.some(name => ["天德", "月德", "天德合", "月德合", "天赦", "三合", "六合"].includes(name));
    if (!relieved) hits.push(ruleHit("FIVE_SEPARATIONS_RETAINED_TABOOS", "五离", "凶煞", XIEJI_VOLUME_10, CANONICAL,
      [], activities("庆赐赏贺,宴会,结婚姻,纳采问名,立券,交易"), "申酉日且无德合赦三合六合解忌", "卷十五离所忌及指定解忌，月恩四相不在此列。"));
  }
  const earthwork = activities("营建宫室,修宫室,缮城郭,筑堤防,兴造动土,修仓库,修置产室,开渠,穿井,安碓硙,补垣,修饰垣墙,平治道涂,破屋,坏垣,栽种,破土");
  for (const name of ["土府", "土王用事"]) {
    if (bad.has(name)) hits.push(ruleHit(`EARTHWORK_${name}_RETAINED_TABOOS`, name, "土工专忌",
      XIEJI_VOLUME_10, CANONICAL, [], earthwork,
      name === "土府" ? "建日同位土府" : "四立前十八个UTC+08:00民用日",
      "卷十土府条逢德仍忌土工；土王用事条明言义同土府。"));
  }
  if (bad.has("死气")) {
    const relief = almanac.gods.virtuePresent && ![4, 10].includes(month.branchIndex);
    hits.push(ruleHit("DEAD_QI_RETAINED_TABOOS", "死气", "凶煞", XIEJI_VOLUME_10, CANONICAL, [],
      relief ? LIMITED_SEVERE_AVOIDS : activities("安抚边境,选将,训兵,出师,解除,求医,疗病,修置产室,栽种"),
      "定日同位死气", relief ? "卷十逢四德止忌军事及求医疗病。" : "卷十死气本忌；辰戌月叠月厌，逢四德仍忌。"));
  }
  if (bad.has("小耗")) {
    const retained = [0, 3, 6, 9].includes(month.branchIndex);
    const relief = (almanac.gods.virtuePresent || almanac.gods.auspicious.includes("天愿")) && !retained;
    hits.push(ruleHit(retained ? "SMALL_CONSUMPTION_RETAINED_TABOOS" : "SMALL_CONSUMPTION", "小耗", "凶煞",
      XIEJI_VOLUME_10, CANONICAL, [], relief ? [] : activities("修仓库,开市,立券,交易,纳财,开仓库,出货财"),
      "执日同位小耗", "卷十逢四德或天愿不忌；子午卯酉月叠劫煞则逢德仍忌。"));
  }
  if (bad.has("劫煞")) hits.push(severe("ROBBERY_SHA", "劫煞", THREE_SHA_AVOIDS, "命中月建三合绝地"));
  if (bad.has("灾煞")) {
    const canonicalRelief = almanac.gods.virtuePresent && almanac.dayOfficer.name === "满"
      && [1, 4, 7, 10].includes(month.branchIndex);
    hits.push(ruleHit(canonicalRelief ? "DISASTER_SHA_RETAINED_TABOOS" : "DISASTER_SHA", "灾煞", "凶煞",
      XIEJI_VOLUME_10, CANONICAL, [], canonicalRelief ? LIMITED_SEVERE_AVOIDS : THREE_SHA_AVOIDS,
      "命中月建三合正冲", canonicalRelief
        ? "卷十专例：辰戌丑未月满日与德神并，止忌军事及求医疗病，其余不忌。"
        : "灾煞所忌同劫煞；天火另忌苫盖。"));
    if (!canonicalRelief) {
      hits.push(ruleHit("HEAVENLY_FIRE", "天火", "凶煞", XIEJI_VOLUME_10, CANONICAL, [], activities("苫盖"), "灾煞同位天火", "卷十专忌苫盖。"));
    }
  }
  if (bad.has("月煞")) {
    hits.push(severe("MONTH_SHA", "月煞", [...THREE_SHA_AVOIDS, ...activities("开仓库,出货财")], "命中月建三合尽地"));
  }
  if (bad.has("月害")) {
    hits.push(ruleHit("MONTH_HARM", "月害", "凶煞", XIEJI_VOLUME_10, CANONICAL, [],
      activities("祈福,求嗣,上册进表章,庆赐赏贺,宴会,安抚边境,选将,训兵,出师,结婚姻,纳采问名,嫁娶,进人口,求医,疗病,修仓库,经络,酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,牧养,纳畜,破土,安葬,启攒"),
      "日支冲月建六合之支", "卷十称月害之凶轻于刑煞，但非德不可解。"));
  }
  if (bad.has("天狗")) {
    hits.push(ruleHit("TIAN_GOU_RETAINED_TABOOS", "天狗", "凶煞", XIEJI_VOLUME_10, CANONICAL, [], activities("祭祀"), "申月戌日为满日", "卷十明定天狗忌祭祀，与德神并仍忌；祈福、求嗣不注宜。"));
  }
}

function inArc(longitude, start, end) {
  return start < end ? longitude >= start && longitude < end : longitude >= start || longitude < end;
}

function addOfficerCombinationRules(hits, almanac, solarLongitude) {
  const officer = almanac.dayOfficer.name;
  const seasonal = [];
  if (officer === "危" && inArc(solarLongitude, 225, 315)) seasonal.push("伐木");
  if (["执", "危", "收"].includes(officer) && inArc(solarLongitude, 210, 315)) seasonal.push("畋猎");
  if (["执", "危", "收"].includes(officer) && inArc(solarLongitude, 330, 45)) seasonal.push("取鱼");
  if (seasonal.length > 0) {
    hits.push(ruleHit(`OFFICER_SEASONAL_${officer}`, `${officer}日节令用事`, "建除节令组合",
      XIEJI_VOLUME_10, CANONICAL, [...new Set(seasonal)], [], `命中${officer}日及相应太阳黄经区间`,
      "卷十依霜降、立冬、雨水、立春、立夏限定伐木畋猎取鱼。"));
  }
  if (officer === "收" && almanac.gods.auspicious.some((god) => ["月恩", "四相", "时德"].includes(god))) {
    hits.push(ruleHit("OFFICER_RECEIVE_STOREHOUSE_COMBINATION", "收日修仓库组合", "建除神煞组合",
      XIEJI_VOLUME_10, CANONICAL, activities("修仓库"), [], "收日与月恩、四相或时德同现",
      "卷十明定收日无修造义，须与月恩、四相、时德并后才宜修仓库。"));
  }
  const good = new Set(almanac.gods.auspicious);
  if (good.has("母仓") && (good.has("月恩") || good.has("四相") || officer === "开")) {
    hits.push(ruleHit("MATERNAL_STOREHOUSE_REPAIR_COMBINATION", "母仓修仓库组合", "吉神组合",
      XIEJI_VOLUME_10, CANONICAL, activities("修仓库"), [], "母仓与月恩、四相或开日同现",
      "卷十明定母仓须与月恩、四相或开日并，才宜修仓库。"));
  }
}

function dayGrade(hits, month) {
  if (hits.some((hit) => hit.ruleId === "MONTH_BREAK_ABSOLUTE_RETAINED_TABOOS")) return { key: "LOWEST", name: "最下" };
  if (hits.some((hit) => hit.ruleId === "DISASTER_SHA_RETAINED_TABOOS")) return { key: "MIDDLE", name: "中" };
  const monthSha = hits.some((hit) => hit.ruleId === "MONTH_SHA");
  const exhaustedOfficer = hits.some((hit) => ["OFFICER_平", "OFFICER_闭"].includes(hit.ruleId));
  if (monthSha && exhaustedOfficer) return { key: "INFERIOR", name: "下" };
  const monthBreak = hits.some((hit) => hit.ruleId === "OFFICER_破");
  if (monthBreak && [3, 9].includes(month.branchIndex)) return { key: "LOWEST", name: "最下" };
  if (monthBreak && [0, 6, 7, 8].includes(month.branchIndex)) return { key: "INFERIOR", name: "下" };
  return { key: "UNDETERMINED", name: "未定" };
}

function disposition(recommends, avoids, grade, virtue, allAvoided, retainedTaboo, suppressed) {
  if (allAvoided || retainedTaboo) return "AVOID";
  if (suppressed) return avoids.length === 0 ? "OMITTED" : "AVOID";
  if (recommends.length === 0) return avoids.length === 0 ? "OMITTED" : "AVOID";
  if (avoids.length === 0) return "RECOMMENDED";
  if (grade.key === "UNDETERMINED") return "CAUTION";
  if (grade.key === "SUPERIOR") return "RECOMMENDED";
  if (grade.key === "SUPERIOR_SECOND") return virtue ? "RECOMMENDED" : "CAUTION";
  if (grade.key === "MIDDLE") return virtue ? "RECOMMENDED" : "AVOID";
  if (grade.key === "MIDDLE_SECOND") return virtue ? "CAUTION" : "AVOID";
  return "AVOID";
}

function rationale(recommends, avoids, result, grade, virtue, allAvoided, canonical, retainedTaboo, suppressed) {
  if (allAvoided) return `日等为${grade.name}，按六等表归入诸事皆忌。`;
  if (retainedTaboo) return "卷十制化专例明确保留此忌，优先于通用六等冲突表。";
  if (suppressed) return avoids.length === 0 ? "卷十专例规定不注宜，故不输出到宜项。" : "卷十专例先撤销宜项，再采用其余忌项。";
  if (recommends.length === 0 || avoids.length === 0) {
    return canonical ? "官修主规则只有单向结论，直接采用。" : "官修主规则未裁定，由低等级传统补充。";
  }
  if (grade.key === "UNDETERMINED") return "未命中已核定等第专例，保留双方原始宜忌，不以数字加权推定古籍日等。";
  return `官修规则发生冲突；日等=${grade.name}，德神=${virtue ? "有" : "无"}，依六等表裁为${result}。`;
}

function resolve(hits, grade, virtuePresent, allActivitiesAvoided, selected, day) {
  const evidence = new Map();
  const relief = selected?.onlySpecifiedRelief ? selected.gradeRelief : virtuePresent || selected?.gradeRelief;
  const { suppressRecommend: suppressedActivities, noAvoid } = placementSets(hits, grade, relief, day);
  const relievedRules = new Set(selected?.relieveRules ?? []);
  const allRelieved = selected?.allRelieved;
  for (const hit of hits) if (hit.ruleId.startsWith("CLASSICAL_RAW_")) relievedRules.add(hit.ruleId);
  if (grade.key === "SUPERIOR" || relief && ["MIDDLE", "SUPERIOR_SECOND"].includes(grade.key)) {
    for (const id of selected?.relieveOnVictory ?? []) relievedRules.add(id);
  }
  const add = (activity, field, ruleId) => {
    if (!evidence.has(activity)) {
      evidence.set(activity, { canonicalRecommend: [], canonicalAvoid: [], supplementalRecommend: [], supplementalAvoid: [] });
    }
    evidence.get(activity)[field].push(ruleId);
  };
  for (const hit of hits) {
    const canonical = hit.evidenceLevel === CANONICAL;
    for (const activity of hit.recommends) add(activity, canonical ? "canonicalRecommend" : "supplementalRecommend", hit.ruleId);
    for (const activity of hit.avoids) add(activity, canonical ? "canonicalAvoid" : "supplementalAvoid", hit.ruleId);
  }

  // The linked clauses suppress taboo printing when an activity is reconciled;
  // they are not the inverse rule "taboo A => suppress recommendation B".
  const preliminary = new Set();
  for (const [activity, value] of evidence) {
    if (value.canonicalRecommend.length && value.canonicalAvoid.length
        && !value.canonicalAvoid.some(id => id.endsWith("_RETAINED_TABOOS") || id === "OFFICER_破")
        && (["SUPERIOR", "SUPERIOR_SECOND"].includes(grade.key) || relief && ["MIDDLE", "MIDDLE_SECOND"].includes(grade.key))) preliminary.add(activity);
  }
  for (const entry of placement.balancedNoAvoidLinks) {
    if (entry.when.every(a => preliminary.has(a))) for (const a of entry.also) noAvoid.add(a);
  }

  const unreconciled = new Set();
  for (const [activity, value] of evidence) {
    const retained = !allRelieved && value.canonicalAvoid.some(id => id.endsWith("_RETAINED_TABOOS") || id === "OFFICER_破");
    const effective = allRelieved ? [] : retained ? value.canonicalAvoid : value.canonicalAvoid.filter(id => !noAvoid.has(activity)
      && !relievedRules.has(id) && !placement.ignoreAvoidRules.some(entry => entry.ruleId === id && entry.activities.includes(activity)));
    if (disposition(value.canonicalRecommend, effective, grade, relief, allActivitiesAvoided, retained, suppressedActivities.has(activity)) === "AVOID") unreconciled.add(activity);
  }
  for (const link of recommendSuppressionLinks) if (link.when.every(a => unreconciled.has(a))) for (const a of link.also) suppressedActivities.add(a);
  const monthAversion = hits.some(hit => hit.ruleId === "MONTH_AVERSION");
  if (hits.some(hit => hit.ruleId === "PRESSING_PLACEMENT")) {
    for (const a of hits.find(hit => hit.ruleId === "PRESSING_PLACEMENT").avoids) suppressedActivities.add(a);
    relievedRules.add("PRESSING_PLACEMENT");
  }
  const aversionChangesProclamation = monthAversion && ["行幸", "上官赴任"].some(a => unreconciled.has(a));
  const goingLoss = hits.some(hit => ["CLASSICAL_RAW_GOING_LOSS", "CALENDAR_QI_GOING_LOSS_RETAINED_TABOOS"].includes(hit.ruleId));
  if (aversionChangesProclamation) {
    for (const a of ["颁诏", "施恩封拜", "诏命公卿", "招贤", "举正直"]) suppressedActivities.add(a);
  }
  if (aversionChangesProclamation || goingLoss) {
    if (evidence.has("宣政事")) {
      const original = evidence.get("宣政事");
      if (original.canonicalRecommend.length) {
        suppressedActivities.add("宣政事");
        for (const id of original.canonicalRecommend) add("布政事", "canonicalRecommend", id);
        for (const id of original.canonicalAvoid) {
          if (aversionChangesProclamation && id.includes("AVERSION") || goingLoss && id.includes("GOING_LOSS")) continue;
          add("布政事", "canonicalAvoid", id);
        }
      }
    }
  } else if (evidence.get("宣政事")?.canonicalRecommend.length) suppressedActivities.add("布政事");
  if (evidence.get("营建宫室")?.canonicalRecommend.length) suppressedActivities.add("修宫室");
  if (hits.some(hit => ["CLASSICAL_RAW_FOUR_TABOO", "CLASSICAL_RAW_FOUR_EXHAUSTION"].includes(hit.ruleId))
      && hits.some(hit => ["CLASSICAL_RAW_BARKING", "CLASSICAL_RAW_BARKING_OPPOSITE"].includes(hit.ruleId))) {
    suppressedActivities.add("破土"); suppressedActivities.add("启攒");
  }

  const recommended = [];
  const avoided = [];
  const caution = [];
  const decisions = [];
  const calendarOmissions = calendarAnnotationOmissions(hits, evidence.keys());
  for (const [activity, value] of evidence) {
    const hasCanonical = value.canonicalRecommend.length > 0 || value.canonicalAvoid.length > 0;
    const recommendBy = hasCanonical ? value.canonicalRecommend : value.supplementalRecommend;
    const avoidBy = hasCanonical ? value.canonicalAvoid : value.supplementalAvoid;
    const excluded = hasCanonical ? [...new Set([...value.supplementalRecommend, ...value.supplementalAvoid])] : [];
    const retainedTaboo = !allRelieved && avoidBy.some((ruleId) => ruleId.endsWith("_RETAINED_TABOOS") || ruleId === "OFFICER_破");
    const suppressed = suppressedActivities.has(activity);
    const effectiveAvoid = allRelieved ? [] : retainedTaboo ? avoidBy : avoidBy.filter(id => !noAvoid.has(activity)
      && !relievedRules.has(id)
      && !placement.ignoreAvoidRules.some(entry => entry.ruleId === id && entry.activities.includes(activity)));
    const omittedByNoSalary = hits.some(hit => hit.ruleId === "CLASSICAL_RAW_NO_SALARY") && !noSalaryAllowed.includes(activity);
    const omittedByCalendar = calendarOmissions.has(activity);
    const result = omittedByNoSalary || omittedByCalendar ? "OMITTED" : disposition(recommendBy, effectiveAvoid, grade, relief, allActivitiesAvoided, retainedTaboo, suppressed);
    if (result === "RECOMMENDED") recommended.push(activity);
    else if (result === "AVOID") avoided.push(activity);
    else if (result === "CAUTION") caution.push(activity);
    decisions.push({ activity, disposition: result, conflict: recommendBy.length > 0 && avoidBy.length > 0,
      recommendedBy: recommendBy, avoidedBy: avoidBy, excludedLowerAuthorityRules: excluded,
      rationale: omittedByCalendar ? "卷十月忌日止注或分至日不注条文：此项不公开铺注，原始宜忌证据保留；不等同解忌或生成宜。" : omittedByNoSalary ? "卷十无禄日仅铺注所列十二类用事，其余不注；不等同一律输出忌。" : effectiveAvoid.length !== avoidBy.length && !allActivitiesAvoided
        ? "卷十逐月解忌或铺注条例不注此忌；原始忌证据保留，不忌不自动生成宜。"
        : rationale(recommendBy, avoidBy, result, grade, relief, allActivitiesAvoided, hasCanonical, retainedTaboo, suppressed) });
  }
  return {
    recommended, avoided, caution, dayGrade: grade.name, virtuePresent, allActivitiesAvoided, decisions, ruleHits: hits,
    policy: {
      name: "《钦定协纪辨方书》六等消解", sourceId: XIEJI_VOLUME_10,
      rule: "上从宜；上次逢德从宜、不逢德宜忌并存；中逢德从宜、不逢德从忌；中次逢德宜忌并存、不逢德从忌；下从忌且无德时诸事皆忌；最下不论德神皆诸事忌。",
      gradeOrder: ["上", "上次", "中", "中次", "下", "最下"],
      supplementalRule: "原文明列的专忌与组合专例优先；未核定等第返回未定，剩余冲突列宜忌并存，不使用整数加权。月破专忌不得由德神翻为宜。低证据传统只补充主规则空白。",
    },
  };
}

export function evaluateActivities(date, month, day, almanac, solarLongitude, calendarDays = { hits: [] }) {
  const officer = OFFICER_RULES.get(almanac.dayOfficer.name);
  const hits = [officerHit(officer, `日支与节月月支推得${almanac.dayOfficer.name}日`)];
  addAuspiciousGodRules(hits, almanac);
  addInauspiciousGodRules(hits, month, almanac);
  addOfficerCombinationRules(hits, almanac, solarLongitude);
  hits.push(...coreGodHits(month, day, almanac));
  hits.push(...calendarDays.hits);
  for (const entry of placement.dayTaboos) {
    if (entry.branch !== undefined && entry.branch !== day.branchIndex || entry.stem !== undefined && entry.stem !== day.stemIndex) continue;
    hits.push(ruleHit(entry.id, "铺注百忌互注", "制化专例", XIEJI_VOLUME_10, CANONICAL, [], entry.avoids,
      "命中卷十互注所列日干支", "卷十百忌与铺注条例联读；出行规范为远行，原文明定不注相联宜项。"));
  }
  if (day.branchIndex === 9) {
    hits.push(ruleHit("DAY_BRANCH_YOU_RETAINED_TABOOS", "酉日用事专例", "制化专例",
      XIEJI_VOLUME_10, CANONICAL, [], activities("宴会"), "当日地支为酉",
      "卷十明定凡酉日忌宴会，并且庆赐赏贺不注宜。"));
  }
  hits.push(ruleHit(`DUTY_GOD_${almanac.dutyGod.name}`, almanac.dutyGod.name, "黄黑道十二值神",
    "XIEJI_BIANFANGSHU_VOLUME_7", CANONICAL, [], [],
    `当日值${almanac.dutyGod.name}，属${almanac.dutyGod.path}`,
    "卷十明言六黄道、六黑道无专宜专忌；仅作吉凶背景，不机械生成活动。"));
  hits.push(ruleHit(`PENGZU_STEM_${day.name}`, "彭祖百忌·天干", "传统附加禁忌", "YUXIAJI_TRADITION",
    TRANSMITTED, [], [STEM_ACTIVITY[day.stemIndex]], almanac.pengZu.heavenlyStemRule,
    "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。"));
  hits.push(ruleHit(`PENGZU_BRANCH_${day.name}`, "彭祖百忌·地支", "传统附加禁忌", "YUXIAJI_TRADITION",
    TRANSMITTED, [], [BRANCH_ACTIVITY[day.branchIndex]], almanac.pengZu.earthlyBranchRule,
    "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。"));
  if (almanac.dayOfficer.name === "破" && [0, 6, 7, 8].includes(month.branchIndex)) {
    hits.push(ruleHit("MONTH_BREAK_COMPOUNDED_RETAINED_TABOOS", "月破叠煞专例", "制化专例",
      XIEJI_VOLUME_10, CANONICAL, [], activities("解除,求医,疗病,破屋,坏垣"),
      "子午月月破叠灾煞，或未申月月破叠月刑", "卷十月破条：逢德仍忌解除、求医疗病、破屋坏垣，无德诸事皆忌。"));
  }
  const absoluteBreakDays = { 5: "癸亥", 11: "丁巳", 7: "癸丑", 1: "丁未" };
  if (almanac.dayOfficer.name === "破" && absoluteBreakDays[month.branchIndex] === day.name) {
    hits.push(ruleHit("MONTH_BREAK_ABSOLUTE_RETAINED_TABOOS", "月破阴阳专例", "制化专例", XIEJI_VOLUME_10,
      CANONICAL, [], [], "月破叠阴阳交破或阳破阴冲", "卷十：四月癸亥、十月丁巳、六月癸丑、十二月丁未诸事皆忌。"));
  }
  let selected = monthlyCase(month, almanac);
  if (pressingCase(month, day)) hits.push(ruleHit("PRESSING_PLACEMENT", "岁薄逐阵铺注", "铺注专例", XIEJI_VOLUME_10,
    CANONICAL, [], aversionAvoids,
    "卷十岁薄逐阵日", "所宜照月厌所忌删，所忌仍从本日；不凭此条新增忌。"));
  if (universalRelief(month, day)) selected = { ...(selected ?? { id: "EIGHT_RELIEF", officer: almanac.dayOfficer.name,
    grade: "UNDETERMINED", note: "卷十明列八个德赦愿会合干支，诸事不忌，不自动生成宜。" }), allRelieved: true };
  if (selected) {
    hits.push(ruleHit("MONTHLY_" + selected.id, selected.officer + "日逐月制化", "逐月组合",
      XIEJI_VOLUME_10, CANONICAL, [], selected.addAvoids ?? [], `节月支=${month.branchIndex}`, selected.note));
    if (selected.retained?.length) hits.push(ruleHit("MONTHLY_" + selected.id + "_RETAINED_TABOOS", "逐月仍忌用事", "制化专例",
      XIEJI_VOLUME_10, CANONICAL, [], selected.retained, `节月支=${month.branchIndex}`, selected.note));
  }
  const names = { SUPERIOR: "上", SUPERIOR_SECOND: "上次", MIDDLE: "中", MIDDLE_SECOND: "中次", INFERIOR: "下", LOWEST: "最下", UNDETERMINED: "未定" };
  const absolute = absoluteCase(month, day), abandonedBreak = almanac.dayOfficer.name === "破" && almanac.gods.inauspicious.includes("四废");
  if (absolute || abandonedBreak) hits.push(ruleHit("ABSOLUTE_CLASSICAL_RETAINED_TABOOS", "诸事皆忌专例", "制化专例", XIEJI_VOLUME_10,
    CANONICAL, [], [], absolute ? absolute.name : "四废叠月破", "卷十明定诸事皆忌，优先于普通逐月条件。"));
  const grade = absolute || abandonedBreak ? { key: "LOWEST", name: "最下" } : selected ? { key: selected.grade, name: names[selected.grade] } : dayGrade(hits, month);
  const relief = selected?.onlySpecifiedRelief ? selected.gradeRelief : almanac.gods.virtuePresent || selected?.gradeRelief;
  const allAvoided = grade.key === "LOWEST" || (grade.key === "INFERIOR" && !relief);
  return resolve(hits, grade, almanac.gods.virtuePresent, allAvoided, selected, day);
}
