import { daysBetween, mod } from "./astronomy.js";
import { BRANCHES, STEMS, ZODIAC } from "./calendar.js";

const OFFICERS = ["建", "除", "满", "平", "定", "执", "破", "危", "成", "收", "开", "闭"];
const DUTY_GODS = ["青龙", "明堂", "天刑", "朱雀", "金匮", "天德", "白虎", "玉堂", "天牢", "玄武", "司命", "勾陈"];
const YELLOW_PATH = [true, true, false, false, true, true, false, true, false, false, true, false];
const STEM_TABOOS = [
  "甲不开仓，财物耗亡", "乙不栽植，千株不长", "丙不修灶，必见火殃", "丁不剃头，头主生疮", "戊不受田，田主不祥",
  "己不破券，二主并亡", "庚不经络，织机虚张", "辛不合酱，主人不尝", "壬不决水，难更堤防", "癸不词论，理弱敌强",
];
const BRANCH_TABOOS = [
  "子不问卜，自惹灾殃", "丑不冠带，主不还乡", "寅不祭祀，鬼神不尝", "卯不穿井，泉水不香",
  "辰不哭泣，必主重丧", "巳不远行，财物伏藏", "午不苫盖，室主更张", "未不服药，毒气入肠",
  "申不安床，鬼祟入房", "酉不会客，宾主有伤", "戌不吃犬，作怪上床", "亥不嫁娶，必主分张",
];
const FETAL_GOD_POSITIONS = [
  "占门碓外东南", "碓磨厕外东南", "厨灶炉外正南", "仓库门外正南", "房床栖外正南", "占门床外正南",
  "占碓磨外正南", "厨灶厕外西南", "仓库炉外西南", "房床门外西南", "门鸡栖外西南", "碓磨床外西南",
  "厨灶碓外西南", "仓库厕外正西", "房床炉外正西", "占大门外正西", "碓磨栖外正西", "厨灶床外正西",
  "仓库碓外西北", "房床厕外西北", "占门炉外西北", "碓磨门外西北", "厨灶栖外西北", "仓库床外西北",
  "房床碓外正北", "占门厕外正北", "碓磨炉外正北", "厨灶门外正北", "仓库栖外正北", "占房床房内北",
  "占门碓房内北", "碓磨厕房内北", "厨灶炉房内北", "仓库门房内北", "房床栖房内中", "占门床房内中",
  "占碓磨房内南", "厨灶厕房内南", "仓库炉房内南", "房床门房内西", "门鸡栖房内东", "碓磨床房内东",
  "厨灶碓房内东", "仓库厕房内东", "房床炉房内中", "占大门外东北", "碓磨栖外东北", "厨灶床外东北",
  "仓库碓外东北", "房床厕外东北", "占门炉外东北", "碓磨门外正东", "厨灶栖外正东", "仓库床外正东",
  "房床碓外正东", "占门厕外正东", "碓磨炉外东南", "厨灶门外东南", "仓库栖外东南", "占房床外东南",
];
const MANSIONS = [
  "角", "亢", "氐", "房", "心", "尾", "箕", "斗", "牛", "女", "虚", "危", "室", "壁",
  "奎", "娄", "胃", "昴", "毕", "觜", "参", "井", "鬼", "柳", "星", "张", "翼", "轸",
];
const MANSION_FULL_NAMES = [
  "角木蛟", "亢金龙", "氐土貉", "房日兔", "心月狐", "尾火虎", "箕水豹", "斗木獬", "牛金牛", "女土蝠", "虚日鼠", "危月燕", "室火猪", "壁水貐",
  "奎木狼", "娄金狗", "胃土雉", "昴日鸡", "毕月乌", "觜火猴", "参水猿", "井木犴", "鬼金羊", "柳土獐", "星日马", "张月鹿", "翼火蛇", "轸水蚓",
];
const MANSION_LUCK = [
  true, false, false, true, false, true, true, true, false, false, false, false, true, true,
  false, true, true, false, true, false, true, true, false, false, false, true, false, true,
];
const SIX_HARMONY = [1, 0, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const SIX_HARM = [7, 6, 5, 4, 3, 2, 1, 0, 11, 10, 9, 8];

function inArc(longitude, start, end) {
  return start < end ? longitude >= start && longitude < end : longitude >= start || longitude < end;
}

function calculateDayOfficer(month, day) {
  const index = mod(day.branchIndex - month.branchIndex, 12);
  return {
    name: OFFICERS[index],
    generalNature: [1, 4, 5, 7, 8, 10].includes(index) ? "通常为吉" : "通常为凶",
    sourceId: "XIEJI_BIANFANGSHU_VOLUME_4",
  };
}

function calculateDutyGod(month, day) {
  const startByMonthBranch = { 2: 0, 8: 0, 3: 2, 9: 2, 4: 4, 10: 4, 5: 6, 11: 6, 0: 8, 6: 8, 1: 10, 7: 10 };
  const index = mod(day.branchIndex - startByMonthBranch[month.branchIndex], 12);
  return {
    name: DUTY_GODS[index],
    path: YELLOW_PATH[index] ? "黄道" : "黑道",
    luck: YELLOW_PATH[index] ? "吉" : "凶",
    sourceId: "XIEJI_BIANFANGSHU_VOLUME_7",
  };
}

function isThreeHarmony(monthBranch, dayBranch) {
  const groups = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
  return groups.some((group) => group.includes(monthBranch) && group.includes(dayBranch) && monthBranch !== dayBranch);
}

function threeShaBranches(monthBranch) {
  if ([8, 0, 4].includes(monthBranch)) return [5, 6, 7];
  if ([2, 6, 10].includes(monthBranch)) return [11, 0, 1];
  if ([5, 9, 1].includes(monthBranch)) return [2, 3, 4];
  return [8, 9, 10];
}

function isHeavenlyPardon(day, longitude) {
  if (inArc(longitude, 315, 45)) return day.name === "戊寅";
  if (inArc(longitude, 45, 135)) return day.name === "甲午";
  if (inArc(longitude, 135, 225)) return day.name === "戊申";
  return day.name === "甲子";
}

function isMaternalStorehouse(dayBranch, longitude) {
  if (inArc(longitude, 315, 45)) return [11, 0].includes(dayBranch);
  if (inArc(longitude, 45, 135)) return [2, 3].includes(dayBranch);
  if (inArc(longitude, 135, 225)) return [1, 4, 7, 10].includes(dayBranch);
  return [8, 9].includes(dayBranch);
}

function addOfficerAliases(officer, dayBranch, auspicious, inauspicious) {
  const aliases = {
    "建": [["兵福"], []], "除": [["吉期", "兵宝"], []], "满": [["天巫", "福德"], dayBranch === 10 ? ["天狗"] : []],
    "平": [[], ["死神"]], "定": [["时阴"], []], "破": [[], ["月破", "大耗"]],
    "成": [["天喜", "天医"], []], "开": [["时阳", "生气"], []], "闭": [[], ["血支"]],
  };
  const pair = aliases[officer];
  if (pair) {
    auspicious.push(...pair[0]);
    inauspicious.push(...pair[1]);
  }
}

function calculateGods(month, day, officer, solarLongitude) {
  const auspicious = [];
  const inauspicious = [];
  const monthOrdinal = mod(month.branchIndex - 2, 12);
  const monthVirtueStem = [2, 0, 8, 6][monthOrdinal % 4];
  if (day.stemIndex === monthVirtueStem) auspicious.push("月德");
  if (day.stemIndex === (monthVirtueStem + 5) % 10) auspicious.push("月德合");
  const heavenlyVirtueStem = [3, -1, 8, 7, -1, 0, 9, -1, 2, 1, -1, 6][monthOrdinal];
  const heavenlyVirtueBranch = [-1, 8, -1, -1, 11, -1, -1, 2, -1, -1, 5, -1][monthOrdinal];
  if ((heavenlyVirtueStem >= 0 && day.stemIndex === heavenlyVirtueStem)
      || day.branchIndex === heavenlyVirtueBranch) auspicious.push("天德");
  if (heavenlyVirtueStem >= 0 && day.stemIndex === (heavenlyVirtueStem + 5) % 10) auspicious.push("天德合");
  if (day.index <= 4 || (day.index >= 15 && day.index <= 19) || (day.index >= 45 && day.index <= 49)) auspicious.push("天恩");
  if (day.stemIndex === [2, 3, 6, 5, 4, 7, 8, 9, 6, 1, 0, 7][monthOrdinal]) auspicious.push("月恩");
  const season = Math.floor(monthOrdinal / 3);
  if ([[2, 3], [4, 5], [8, 9], [0, 1]][season].includes(day.stemIndex)) auspicious.push("四相");
  if (day.branchIndex === [6, 4, 0, 2][season]) auspicious.push("时德");
  const seasonalDays = [
    ["王日", [2, 5, 8, 11]], ["官日", [3, 6, 9, 0]], ["守日", [4, 7, 10, 1]],
    ["相日", [5, 8, 11, 2]], ["民日", [6, 9, 0, 3]],
  ];
  for (const [name, branches] of seasonalDays) {
    if (day.branchIndex === branches[season]) auspicious.push(name);
  }
  if (isHeavenlyPardon(day, solarLongitude)) auspicious.push("天赦");
  if (isMaternalStorehouse(day.branchIndex, solarLongitude)) auspicious.push("母仓");
  if (isThreeHarmony(month.branchIndex, day.branchIndex)) auspicious.push("三合");
  if (SIX_HARMONY[month.branchIndex] === day.branchIndex) auspicious.push("六合");
  addOfficerAliases(officer, day.branchIndex, auspicious, inauspicious);

  const threeSha = threeShaBranches(month.branchIndex);
  if (day.branchIndex === threeSha[0]) inauspicious.push("劫煞");
  if (day.branchIndex === threeSha[1]) inauspicious.push("灾煞", "天火");
  if (day.branchIndex === threeSha[2]) inauspicious.push("月煞", "月虚");
  if (SIX_HARM[month.branchIndex] === day.branchIndex) inauspicious.push("月害");
  const virtuePresent = auspicious.some((name) => ["天德", "月德", "天德合", "月德合"].includes(name));
  return { auspicious, inauspicious, virtuePresent };
}

function calculateClash(day) {
  const branch = (day.branchIndex + 6) % 12;
  const stem = (day.stemIndex + 4) % 10;
  const directionByBranchGroup = [
    [[5, 9, 1], "东"], [[11, 3, 7], "西"], [[8, 0, 4], "南"], [[2, 6, 10], "北"],
  ];
  const direction = directionByBranchGroup.find(([branches]) => branches.includes(day.branchIndex))[1];
  const opposingPillar = STEMS[stem] + BRANCHES[branch];
  const zodiac = ZODIAC[branch];
  return { opposingPillar, zodiac, direction, description: `冲${zodiac}（${opposingPillar}），煞${direction}` };
}

function calculateMansion(date) {
  const index = mod(22 + daysBetween("2000-01-07", date), 28);
  const palaceIndex = Math.floor(index / 7);
  const palaces = ["东方青龙", "北方玄武", "西方白虎", "南方朱雀"];
  const guardians = ["青龙", "玄武", "白虎", "朱雀"];
  return {
    name: MANSIONS[index], fullName: MANSION_FULL_NAMES[index], luck: MANSION_LUCK[index] ? "吉" : "凶",
    palace: palaces[palaceIndex], guardian: guardians[palaceIndex], sourceId: "XIEJI_BIANFANGSHU_VOLUME_1",
    anchor: "2000-01-07=鬼宿（现代通行七元锚点）", evidenceLevel: "D_CONVENTIONAL_ANCHOR",
    limitation: "《协纪辨方书》确认420日七元周期，但明言绝对起元年月不可考；值宿依赖公开的现代通行锚点。",
  };
}

export function calculateTraditionalAlmanac(date, month, day, solarLongitude) {
  const dayOfficer = calculateDayOfficer(month, day);
  const dutyGod = calculateDutyGod(month, day);
  return {
    dayOfficer,
    dutyGod,
    gods: calculateGods(month, day, dayOfficer.name, solarLongitude),
    pengZu: {
      heavenlyStemRule: STEM_TABOOS[day.stemIndex], earthlyBranchRule: BRANCH_TABOOS[day.branchIndex],
      sourceId: "YUXIAJI_TRADITION", evidenceLevel: "C_TRADITIONAL_TRANSMISSION",
    },
    clash: calculateClash(day),
    fetalGod: { position: FETAL_GOD_POSITIONS[day.index], sourceId: "FETAL_GOD_TRADITION", evidenceLevel: "C_TRADITIONAL_TRANSMISSION" },
    mansion: calculateMansion(date),
  };
}
