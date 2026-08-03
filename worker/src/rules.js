const CANONICAL = "B_PRIMARY_TEXT_TRANSCRIPTION";
const TRANSMITTED = "C_TRADITIONAL_TRANSMISSION";
const XIEJI_VOLUME_10 = "XIEJI_BIANFANGSHU_VOLUME_10";

const activities = (value) => value ? value.split(",") : [];
const VIRTUE_RECOMMENDS = activities(
  "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独,宣政事," +
  "行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,行幸,遣使,安抚边境,选将,训兵,上官赴任,临政亲民," +
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

function spec(name, favorableStrength, unfavorableStrength, recommends, avoids, note) {
  return { id: `OFFICER_${name}`, name: `${name}日`, favorableStrength, unfavorableStrength,
    recommends: activities(recommends), avoids: activities(avoids), note };
}

const OFFICER_RULES = new Map([
  ["建", spec("建", 1, 1,
    "施恩封拜,诏命公卿,招贤,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
    "祈福,求嗣,上册进表章,结婚姻,纳采问名,解除,整容,剃头,整手足甲,求医,疗病,营建宫室,修宫室,缮城郭,兴造动土,竖柱上梁,修仓库,开仓库,出货财,修置产室,破屋,坏垣,伐木,栽种,破土,安葬,启攒",
    "建为月主，叠吉则吉、叠凶则凶；土府类土工专忌。")],
  ["除", spec("除", 1, 0,
    "解除,沐浴,整容,剃头,整手足甲,求医,疗病,扫舍宇,施恩封拜,举正直,行幸,遣使,上官赴任,临政亲民,安抚边境,选将,训兵,出师",
    "", "除旧布新；并取吉期、兵宝。")],
  ["满", spec("满", 1, 1,
    "进人口,裁制,修仓库,经络,开市,立券,交易,纳财,开仓库,出货财,补垣,塞穴,祭祀,祈福,上册进表章,庆赐赏贺,宴会,修宫室,缮城郭",
    "施恩封拜,诏命公卿,招贤,举正直,上官赴任,临政亲民,结婚姻,纳采问名,求医,疗病",
    "满取丰豫之义；兼天巫、福德，盈气所忌另列。")],
  ["平", spec("平", 1, 2, "修饰垣墙,平治道涂",
    "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,解除,求医,疗病," +
    "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,修仓库,鼓铸,经络,酝酿,开市,立券,交易,纳财," +
    "开仓库,出货财,修置产室,开渠,穿井,栽种,牧养,纳畜,破土,安葬,启攒",
    "平日为月建阴气既尽，凶次于月破。")],
  ["定", spec("定", 1, 0, "冠带,运谋算画,计策", "", "定为三合之中，取方中未昃之义。")],
  ["执", spec("执", 1, 0, "捕捉", "", "执取捕捉；畋猎、取鱼另受节令条件约束。")],
  ["破", { id: "OFFICER_破", name: "破日", favorableStrength: 1, unfavorableStrength: 3,
    recommends: activities("求医,疗病,破屋,坏垣"), avoids: MONTH_BREAK_AVOIDS,
    note: "月破为月建之冲与气绝之地，德神临此亦不能普遍解忌。" }],
  ["危", spec("危", 1, 0, "安抚边境,选将,训兵,安床", "", "危日取安为义；伐木畋猎取鱼另受节令约束。")],
  ["成", spec("成", 2, 0,
    "入学,安抚边境,搬移,筑堤防,开市,施恩封拜,举正直,庆赐赏贺,宴会,行幸,遣使,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,求医,疗病",
    "", "成为合局之终；兼天喜、天医。")],
  ["收", spec("收", 1, 2, "进人口,纳财,捕捉,纳畜",
    "祈福,求嗣,上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,冠带,行幸,遣使," +
    "安抚边境,选将,训兵,出师,上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,搬移,安床,解除,求医,疗病," +
    "裁制,营建宫室,修宫室,缮城郭,筑堤防,兴造动土,竖柱上梁,鼓铸,经络,酝酿,开市,立券,交易," +
    "开仓库,出货财,修置产室,开渠,穿井,破土,安葬,启攒",
    "收取诸收，但阳气既尽，宜忌须综合德神与他煞。")],
  ["开", spec("开", 3, 1,
    "祭祀,祈福,求嗣,上册进表章,颁诏,覃恩,肆赦,施恩封拜,诏命公卿,招贤,举正直,施恩惠恤孤独," +
    "宣政事,行惠爱,雪冤枉,缓刑狱,庆赐赏贺,宴会,入学,行幸,遣使,上官赴任,临政亲民,搬移,解除," +
    "求医,疗病,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,开市,修置产室,开渠,穿井,安碓硙,栽种,牧养",
    "伐木,畋猎,取鱼,破土,安葬,启攒", "开日一阳始生，卷十称其日最吉。")],
  ["闭", spec("闭", 1, 2, "筑堤防,补垣,塞穴",
    "上册进表章,颁诏,施恩封拜,诏命公卿,招贤,举正直,宣政事,庆赐赏贺,宴会,行幸,遣使,出师," +
    "上官赴任,临政亲民,结婚姻,纳采问名,嫁娶,进人口,搬移,安床,求医,疗病,营建宫室,修宫室," +
    "兴造动土,竖柱上梁,开市,开仓库,出货财,修置产室,开渠,穿井,针刺",
    "闭取敛息之义；血支专忌针刺。")],
]);

function ruleHit(ruleId, name, category, sourceId, evidenceLevel, favorableStrength,
  unfavorableStrength, recommends, avoids, matchedBecause, note) {
  return { ruleId, name, category, sourceId, evidenceLevel, favorableStrength,
    unfavorableStrength, recommends, avoids, matchedBecause, note };
}

function officerHit(value, matchedBecause) {
  return ruleHit(value.id, value.name, "建除十二神", XIEJI_VOLUME_10, CANONICAL,
    value.favorableStrength, value.unfavorableStrength, value.recommends, value.avoids, matchedBecause, value.note);
}

function severe(id, name, strength, avoids, matchedBecause) {
  return ruleHit(id, name, "凶煞", XIEJI_VOLUME_10, CANONICAL, 0, strength, [], avoids,
    matchedBecause, "按卷十逐项宜忌及六等制化处理。");
}

function addAuspiciousGodRules(hits, almanac) {
  for (const god of almanac.gods.auspicious) {
    if (["天德", "月德", "天德合", "月德合"].includes(god)) {
      hits.push(ruleHit(`VIRTUE_${god}_RETAINED_TABOOS`, god, "吉神", XIEJI_VOLUME_10, CANONICAL, 3, 0,
        VIRTUE_RECOMMENDS, activities("畋猎,取鱼"), `命中${god}起例`, "卷十列为上吉；忌畋猎取鱼以免伤生气。"));
    } else if (god === "天赦") {
      hits.push(ruleHit("HEAVENLY_PARDON_RETAINED_TABOOS", "天赦", "吉神", XIEJI_VOLUME_10, CANONICAL, 3, 0,
        HEAVENLY_PARDON_RECOMMENDS, activities("畋猎,取鱼"), "命中四时天赦干支", "天地合德、四时旺辰，能解诸凶；不用于出师。"));
    } else if (god === "天恩") {
      hits.push(ruleHit("HEAVENLY_GRACE", "天恩", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
        HEAVENLY_GRACE_RECOMMENDS, [], "命中六十甲子天恩日段", "卷五起例、卷十逐项用事。"));
    } else if (["月恩", "四相", "时德"].includes(god)) {
      const ids = { "月恩": "MONTH_GRACE", "四相": "FOUR_PHASES", "时德": "SEASONAL_VIRTUE" };
      hits.push(ruleHit(ids[god], god, "吉神", XIEJI_VOLUME_10, CANONICAL, 1, 0,
        SEASONAL_VIRTUE_RECOMMENDS, [], `命中四时${god}起例`, "卷五起例、卷十将月恩、四相、时德合列用事。"));
    } else if (god === "王日") {
      hits.push(ruleHit("ROYAL_DAY", "王日", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
        ROYAL_DAY_RECOMMENDS, [], "命中四时王日支", "卷五校订起例、卷十逐项用事。"));
    } else if (["官日", "相日"].includes(god)) {
      hits.push(ruleHit(god === "官日" ? "OFFICIAL_DAY" : "ASSISTING_DAY", god, "吉神",
        XIEJI_VOLUME_10, CANONICAL, 1, 0, OFFICE_DAY_RECOMMENDS, [], `命中四时${god}支`, "卷五校订起例、卷十逐项用事。"));
    } else if (god === "守日") {
      hits.push(ruleHit("GUARDING_DAY", "守日", "吉神", XIEJI_VOLUME_10, CANONICAL, 1, 0,
        GUARDING_DAY_RECOMMENDS, [], "命中四时守日支", "卷五校订起例、卷十逐项用事。"));
    } else if (god === "民日") {
      hits.push(ruleHit("PEOPLE_DAY", "民日", "吉神", XIEJI_VOLUME_10, CANONICAL, 1, 0,
        PEOPLE_DAY_RECOMMENDS, [], "命中四时民日支", "卷五校订起例、卷十逐项用事。"));
    } else if (god === "母仓") {
      hits.push(ruleHit("MATERNAL_STOREHOUSE", "母仓", "吉神", XIEJI_VOLUME_10, CANONICAL, 1, 0,
        activities("纳财,栽种,牧养,纳畜"), [], "命中四时母仓日支", "卷五起例、卷十宜忌。"));
    } else if (god === "三合") {
      hits.push(ruleHit("THREE_HARMONY", "三合", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
        activities("庆赐赏贺,宴会,结婚姻,纳采问名,嫁娶,进人口,裁制,修宫室,缮城郭,兴造动土,竖柱上梁,修仓库,经络,酝酿,立券,交易,纳财,安碓硙,纳畜"),
        [], "日支与月建构成三合", "卷十称三合为日之吉者所重。"));
    } else if (god === "六合") {
      hits.push(ruleHit("SIX_HARMONY", "六合", "吉神", XIEJI_VOLUME_10, CANONICAL, 2, 0,
        activities("宴会,结婚姻,嫁娶,进人口,经络,酝酿,立券,交易,纳财,纳畜,安葬"),
        [], "日支与月建六合", "卷十称六合之吉不减三合。"));
    }
  }
}

function addInauspiciousGodRules(hits, month, almanac) {
  const bad = new Set(almanac.gods.inauspicious);
  if (bad.has("劫煞")) hits.push(severe("ROBBERY_SHA", "劫煞", 2, THREE_SHA_AVOIDS, "命中月建三合绝地"));
  if (bad.has("灾煞")) {
    const canonicalRelief = almanac.gods.virtuePresent && almanac.dayOfficer.name === "满"
      && [1, 4, 7, 10].includes(month.branchIndex);
    hits.push(ruleHit(canonicalRelief ? "DISASTER_SHA_RETAINED_TABOOS" : "DISASTER_SHA", "灾煞", "凶煞",
      XIEJI_VOLUME_10, CANONICAL, 0, 3, [], canonicalRelief ? LIMITED_SEVERE_AVOIDS : THREE_SHA_AVOIDS,
      "命中月建三合正冲", canonicalRelief
        ? "卷十专例：辰戌丑未月满日与德神并，止忌军事及求医疗病，其余不忌。"
        : "灾煞所忌同劫煞；天火另忌苫盖。"));
    if (!canonicalRelief) {
      hits.push(ruleHit("HEAVENLY_FIRE", "天火", "凶煞", XIEJI_VOLUME_10, CANONICAL, 0, 1,
        [], activities("苫盖"), "灾煞同位天火", "卷十专忌苫盖。"));
    }
  }
  if (bad.has("月煞")) {
    hits.push(severe("MONTH_SHA", "月煞", 3, [...THREE_SHA_AVOIDS, ...activities("开仓库,出货财")], "命中月建三合尽地"));
  }
  if (bad.has("月害")) {
    hits.push(ruleHit("MONTH_HARM", "月害", "凶煞", XIEJI_VOLUME_10, CANONICAL, 0, 1, [],
      activities("祈福,求嗣,上册进表章,庆赐赏贺,宴会,安抚边境,选将,训兵,出师,结婚姻,纳采问名,嫁娶,进人口,求医,疗病,修仓库,经络,酝酿,开市,立券,交易,纳财,开仓库,出货财,修置产室,牧养,纳畜,破土,安葬,启攒"),
      "日支冲月建六合之支", "卷十称月害之凶轻于刑煞，但非德不可解。"));
  }
  if (bad.has("天狗")) {
    hits.push(ruleHit("TIAN_GOU_RETAINED_TABOOS", "天狗", "凶煞", XIEJI_VOLUME_10, CANONICAL,
      0, 1, [], activities("祭祀"), "申月戌日为满日", "卷十明定天狗忌祭祀，与德神并仍忌；祈福、求嗣不注宜。"));
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
      XIEJI_VOLUME_10, CANONICAL, 0, 0, [...new Set(seasonal)], [], `命中${officer}日及相应太阳黄经区间`,
      "卷十依霜降、立冬、雨水、立春、立夏限定伐木畋猎取鱼。"));
  }
  if (officer === "收" && almanac.gods.auspicious.some((god) => ["月恩", "四相", "时德"].includes(god))) {
    hits.push(ruleHit("OFFICER_RECEIVE_STOREHOUSE_COMBINATION", "收日修仓库组合", "建除神煞组合",
      XIEJI_VOLUME_10, CANONICAL, 0, 0, activities("修仓库"), [], "收日与月恩、四相或时德同现",
      "卷十明定收日无修造义，须与月恩、四相、时德并后才宜修仓库。"));
  }
  const good = new Set(almanac.gods.auspicious);
  if (good.has("母仓") && (good.has("月恩") || good.has("四相") || officer === "开")) {
    hits.push(ruleHit("MATERNAL_STOREHOUSE_REPAIR_COMBINATION", "母仓修仓库组合", "吉神组合",
      XIEJI_VOLUME_10, CANONICAL, 0, 0, activities("修仓库"), [], "母仓与月恩、四相或开日同现",
      "卷十明定母仓须与月恩、四相或开日并，才宜修仓库。"));
  }
}

function dayGrade(hits) {
  if (hits.some((hit) => hit.ruleId === "DISASTER_SHA_RETAINED_TABOOS")) return { key: "MIDDLE", name: "中" };
  const monthSha = hits.some((hit) => hit.ruleId === "MONTH_SHA");
  const exhaustedOfficer = hits.some((hit) => ["OFFICER_平", "OFFICER_闭"].includes(hit.ruleId));
  if (monthSha && exhaustedOfficer) return { key: "INFERIOR", name: "下" };
  const monthBreak = hits.some((hit) => hit.ruleId === "OFFICER_破");
  const severeSha = hits.some((hit) => ["DISASTER_SHA", "MONTH_SHA"].includes(hit.ruleId));
  if (monthBreak && severeSha) return { key: "LOWEST", name: "最下" };
  let good = 0;
  let bad = 0;
  let virtueGood = 0;
  for (const hit of hits.filter((value) => value.evidenceLevel === CANONICAL)) {
    if (hit.ruleId.startsWith("VIRTUE_")) virtueGood = Math.max(virtueGood, hit.favorableStrength);
    else good += hit.favorableStrength;
    bad += hit.unfavorableStrength;
  }
  good += virtueGood;
  const difference = good - bad;
  if (difference >= 3) return { key: "SUPERIOR", name: "上" };
  if (difference >= 1) return { key: "SUPERIOR_SECOND", name: "上次" };
  if (difference === 0) return { key: "MIDDLE", name: "中" };
  if (difference >= -2) return { key: "MIDDLE_SECOND", name: "中次" };
  return { key: "INFERIOR", name: "下" };
}

function disposition(recommends, avoids, grade, virtue, allAvoided, retainedTaboo, suppressed) {
  if (allAvoided || retainedTaboo || recommends.length === 0) return "AVOID";
  if (suppressed) return avoids.length === 0 ? "OMITTED" : "AVOID";
  if (avoids.length === 0) return "RECOMMENDED";
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
  return `官修规则发生冲突；日等=${grade.name}，德神=${virtue ? "有" : "无"}，依六等表裁为${result}。`;
}

function resolve(hits, grade, virtuePresent, allActivitiesAvoided) {
  const evidence = new Map();
  const suppressedActivities = new Set();
  if (hits.some((hit) => hit.ruleId === "DAY_BRANCH_YOU_RETAINED_TABOOS")) suppressedActivities.add("庆赐赏贺");
  if (hits.some((hit) => hit.ruleId === "TIAN_GOU_RETAINED_TABOOS")) {
    suppressedActivities.add("祈福");
    suppressedActivities.add("求嗣");
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

  const recommended = [];
  const avoided = [];
  const caution = [];
  const decisions = [];
  for (const [activity, value] of evidence) {
    const hasCanonical = value.canonicalRecommend.length > 0 || value.canonicalAvoid.length > 0;
    const recommendBy = hasCanonical ? value.canonicalRecommend : value.supplementalRecommend;
    const avoidBy = hasCanonical ? value.canonicalAvoid : value.supplementalAvoid;
    const excluded = hasCanonical ? [...new Set([...value.supplementalRecommend, ...value.supplementalAvoid])] : [];
    const retainedTaboo = avoidBy.some((ruleId) => ruleId.endsWith("_RETAINED_TABOOS"));
    const suppressed = suppressedActivities.has(activity);
    const result = disposition(recommendBy, avoidBy, grade, virtuePresent, allActivitiesAvoided, retainedTaboo, suppressed);
    if (result === "RECOMMENDED") recommended.push(activity);
    else if (result === "AVOID") avoided.push(activity);
    else if (result === "CAUTION") caution.push(activity);
    decisions.push({ activity, disposition: result, conflict: recommendBy.length > 0 && avoidBy.length > 0,
      recommendedBy: recommendBy, avoidedBy: avoidBy, excludedLowerAuthorityRules: excluded,
      rationale: rationale(recommendBy, avoidBy, result, grade, virtuePresent, allActivitiesAvoided, hasCanonical, retainedTaboo, suppressed) });
  }
  return {
    recommended, avoided, caution, dayGrade: grade.name, virtuePresent, allActivitiesAvoided, decisions, ruleHits: hits,
    policy: {
      name: "《钦定协纪辨方书》六等消解", sourceId: XIEJI_VOLUME_10,
      rule: "上从宜；上次逢德从宜、不逢德宜忌并存；中逢德从宜、不逢德从忌；中次逢德宜忌并存、不逢德从忌；下从忌且无德时诸事皆忌；最下不论德神皆诸事忌。",
      gradeOrder: ["上", "上次", "中", "中次", "下", "最下"],
      supplementalRule: "原文明列的专忌、逐月及组合专例先执行；其后才用六等关系处理剩余冲突。低证据传统只补充官修主规则未裁定的活动。",
    },
  };
}

export function evaluateActivities(date, month, day, almanac, solarLongitude) {
  const officer = OFFICER_RULES.get(almanac.dayOfficer.name);
  const hits = [officerHit(officer, `日支与节月月支推得${almanac.dayOfficer.name}日`)];
  addAuspiciousGodRules(hits, almanac);
  addInauspiciousGodRules(hits, month, almanac);
  addOfficerCombinationRules(hits, almanac, solarLongitude);
  if (day.branchIndex === 9) {
    hits.push(ruleHit("DAY_BRANCH_YOU_RETAINED_TABOOS", "酉日用事专例", "制化专例",
      XIEJI_VOLUME_10, CANONICAL, 0, 1, [], activities("宴会"), "当日地支为酉",
      "卷十明定凡酉日忌宴会，并且庆赐赏贺不注宜。"));
  }
  hits.push(ruleHit(`DUTY_GOD_${almanac.dutyGod.name}`, almanac.dutyGod.name, "黄黑道十二值神",
    "XIEJI_BIANFANGSHU_VOLUME_7", CANONICAL, 0, 0, [], [],
    `当日值${almanac.dutyGod.name}，属${almanac.dutyGod.path}`,
    "卷十明言六黄道、六黑道无专宜专忌；仅作吉凶背景，不机械生成活动。"));
  hits.push(ruleHit(`PENGZU_STEM_${day.name}`, "彭祖百忌·天干", "传统附加禁忌", "YUXIAJI_TRADITION",
    TRANSMITTED, 0, 0, [], [STEM_ACTIVITY[day.stemIndex]], almanac.pengZu.heavenlyStemRule,
    "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。"));
  hits.push(ruleHit(`PENGZU_BRANCH_${day.name}`, "彭祖百忌·地支", "传统附加禁忌", "YUXIAJI_TRADITION",
    TRANSMITTED, 0, 0, [], [BRANCH_ACTIVITY[day.branchIndex]], almanac.pengZu.earthlyBranchRule,
    "证据等级低于《协纪辨方书》，仅补充主规则未裁定的活动。"));
  const grade = dayGrade(hits);
  const allAvoided = grade.key === "LOWEST" || (grade.key === "INFERIOR" && !almanac.gods.virtuePresent);
  return resolve(hits, grade, almanac.gods.virtuePresent, allAvoided);
}
