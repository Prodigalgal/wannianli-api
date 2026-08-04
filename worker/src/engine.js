import {
  formatUtcPlus8,
  julianDayNumber,
  longitudeAt,
  parseCivil,
  utcPlus8CivilDate,
} from "./astronomy.js";
import { calculateTraditionalAlmanac } from "./almanac.js";
import { calculateChineseCalendar, calculatePillars, calculateSeasonal, calculateXunKong } from "./calendar.js";
import { evaluateActivities } from "./rules.js";

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
const yesNo = (value) => value ? "是" : "否";

function publicPillar(value) {
  return {
    "干支": value.name,
    "天干": value.name[0],
    "地支": value.name[1],
    "生肖": value.zodiac,
    "纳音": value.naYin,
  };
}

function publicXunKong(value) {
  return {
    "所属旬": value.xunName,
    "空亡": value.emptyBranches,
  };
}

function calculateFourPillarXunKong(pillars) {
  return {
    year: calculateXunKong(pillars.year),
    month: calculateXunKong(pillars.month),
    day: calculateXunKong(pillars.day),
    hour: calculateXunKong(pillars.hour),
    sourceIds: ["ZENGSHAN_BUYI_CHAPTER_26", "GUJIN_TUSHU_JICHENG_VOLUME_592"],
  };
}

function publicPeriod(value) {
  return {
    "是否在期内": yesNo(value.active),
    "名称": value.name,
    "第几天": value.dayIndex,
    "总天数": value.totalDays,
    "开始日期": value.startDate,
    "结束日期": value.endDate,
    "描述": value.description,
  };
}

function buildPublicResult(now, date, lunar, pillars, xunKong, seasonal, almanac, activities) {
  const civil = parseCivil(date);
  const weekday = WEEKDAYS[new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay()];
  return {
    "当前时间": formatUtcPlus8(now),
    "公历": {
      "日期": date,
      "年": civil.year,
      "月": civil.month,
      "日": civil.day,
      "星期": weekday,
      "儒略日数": julianDayNumber(date),
    },
    "农历": {
      "年": lunar.year,
      "月": lunar.month,
      "日": lunar.day,
      "是否闰月": yesNo(lunar.leapMonth),
      "本月天数": lunar.daysInMonth,
      "中文日期": lunar.display,
      "月朔日期": lunar.monthStartDate,
      "天文朔时刻": lunar.astronomicalNewMoon.toISOString(),
    },
    "四柱": {
      "年柱": publicPillar(pillars.year),
      "月柱": publicPillar(pillars.month),
      "日柱": publicPillar(pillars.day),
      "时柱": publicPillar(pillars.hour),
    },
    "旬空": {
      "年柱": publicXunKong(xunKong.year),
      "月柱": publicXunKong(xunKong.month),
      "日柱": publicXunKong(xunKong.day),
      "时柱": publicXunKong(xunKong.hour),
    },
    "生肖": pillars.year.zodiac,
    "季节": seasonal.season,
    "节气": {
      "当前节气": seasonal.solarTerm.currentPeriod,
      "今日交节": seasonal.solarTerm.todayTerm,
      "节气第几天": seasonal.solarTerm.dayInPeriod,
      "距下个节气天数": seasonal.solarTerm.daysUntilNext,
      "前一节气": {
        "名称": seasonal.solarTerm.previous.name,
        "交节时刻": seasonal.solarTerm.previous.at,
      },
      "下一节气": {
        "名称": seasonal.solarTerm.next.name,
        "交节时刻": seasonal.solarTerm.next.at,
      },
    },
    "三伏": publicPeriod(seasonal.sanFu),
    "数九": {
      "主口径": seasonal.shuJiu.primaryConvention,
      "主结果": publicPeriod(seasonal.shuJiu.primary),
      "并列口径": seasonal.shuJiu.variants.map(publicPeriod),
    },
    "建除十二神": {
      "名称": almanac.dayOfficer.name,
      "通常吉凶": almanac.dayOfficer.generalNature,
    },
    "黄黑道十二值神": {
      "值神": almanac.dutyGod.name,
      "黄黑道": almanac.dutyGod.path,
      "吉凶": almanac.dutyGod.luck,
    },
    "吉神": almanac.gods.auspicious,
    "凶煞": almanac.gods.inauspicious,
    "彭祖百忌": {
      "天干禁忌": almanac.pengZu.heavenlyStemRule,
      "地支禁忌": almanac.pengZu.earthlyBranchRule,
    },
    "冲煞": {
      "相冲干支": almanac.clash.opposingPillar,
      "相冲生肖": almanac.clash.zodiac,
      "煞方": almanac.clash.direction,
      "冲煞": almanac.clash.description,
    },
    "胎神": almanac.fetalGod.position,
    "二十八宿": {
      "宿名": almanac.mansion.name,
      "全名": almanac.mansion.fullName,
      "吉凶": almanac.mansion.luck,
      "宫位": almanac.mansion.palace,
      "守护": almanac.mansion.guardian,
    },
    "宜忌": {
      "宜": activities.recommended,
      "忌": activities.avoided,
      "宜忌并存": activities.caution,
      "日等": activities.dayGrade,
      "有德神": yesNo(activities.virtuePresent),
      "诸事皆忌": yesNo(activities.allActivitiesAvoided),
    },
  };
}

export function calculateAuditableAlmanac(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError("now must be a valid Date");
  }
  const date = utcPlus8CivilDate(now);
  const lunar = calculateChineseCalendar(date);
  const solarLongitude = longitudeAt(now);
  const pillars = calculatePillars(now, date, solarLongitude);
  const xunKong = calculateFourPillarXunKong(pillars);
  const seasonal = calculateSeasonal(now, solarLongitude);
  const almanac = calculateTraditionalAlmanac(date, pillars.month, pillars.day, solarLongitude);
  const activities = evaluateActivities(date, pillars.month, pillars.day, almanac, solarLongitude);
  return {
    result: buildPublicResult(now, date, lunar, pillars, xunKong, seasonal, almanac, activities),
    audit: {
      fixedOffset: "UTC+08:00",
      solarLongitude,
      lunar,
      pillars,
      xunKong,
      seasonal,
      traditionalAlmanac: almanac,
      activityDecisions: activities.decisions,
      ruleHits: activities.ruleHits,
      conflictPolicy: activities.policy,
    },
  };
}

export function calculateCurrentAlmanac(now = new Date()) {
  return calculateAuditableAlmanac(now).result;
}
