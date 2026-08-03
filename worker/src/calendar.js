import {
  SOLAR_TERM,
  SOLAR_TERMS,
  addCivilDays,
  daysBetween,
  formatUtcPlus8,
  julianDayNumber,
  longitudeAt,
  lunationAtOrBefore,
  mod,
  newMoonInstant,
  parseCivil,
  solarTermInstant,
  utcPlus8CivilDate,
  utcPlus8Parts,
} from "./astronomy.js";

export const STEMS = Object.freeze(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
export const BRANCHES = Object.freeze(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
export const ZODIAC = Object.freeze(["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]);

const NAYIN = Object.freeze([
  "海中金", "炉中火", "大林木", "路旁土", "剑锋金", "山头火", "涧下水", "城头土", "白蜡金", "杨柳木",
  "泉中水", "屋上土", "霹雳火", "松柏木", "长流水", "沙中金", "山下火", "平地木", "壁上土", "金箔金",
  "覆灯火", "天河水", "大驿土", "钗钏金", "桑柘木", "大溪水", "沙中土", "天上火", "石榴木", "大海水",
]);

const MONTH_NAMES = Object.freeze([
  "", "正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "冬月", "腊月",
]);

const DAY_NAMES = Object.freeze([
  "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
]);

function containsMajorSolarTerm(start, end) {
  const startDate = utcPlus8CivilDate(start);
  const endDate = utcPlus8CivilDate(end);
  const startYear = parseCivil(startDate).year;
  const endYear = parseCivil(endDate).year;
  for (let year = startYear - 1; year <= endYear + 1; year++) {
    for (const term of SOLAR_TERMS) {
      if (mod(term.longitude, 30) !== 0) {
        continue;
      }
      const termDate = utcPlus8CivilDate(solarTermInstant(year, term));
      if (termDate >= startDate && termDate < endDate) {
        return true;
      }
    }
  }
  return false;
}

function findLeapMonthIndex(firstLunation, monthCount) {
  for (let index = 1; index < monthCount; index++) {
    if (!containsMajorSolarTerm(newMoonInstant(firstLunation + index), newMoonInstant(firstLunation + index + 1))) {
      return index;
    }
  }
  throw new Error("Thirteen lunar months found without a leap month");
}

function buildMonthSpans(firstLunation, monthCount, leapIndex) {
  const spans = [];
  let month = 11;
  for (let index = 0; index < monthCount; index++) {
    const leap = index === leapIndex;
    if (index > 0 && !leap) {
      month = month % 12 + 1;
    }
    const start = newMoonInstant(firstLunation + index);
    const end = newMoonInstant(firstLunation + index + 1);
    spans.push({
      month,
      leap,
      newMoon: start,
      startDate: utcPlus8CivilDate(start),
      endDate: utcPlus8CivilDate(end),
    });
  }
  return spans;
}

function chineseYear(year) {
  const digits = "〇一二三四五六七八九";
  return String(year).split("").map((digit) => digits[Number(digit)]).join("");
}

export function calculateChineseCalendar(date) {
  const civil = parseCivil(date);
  if (civil.year < 1801 || civil.year > 2199) {
    throw new RangeError("Chinese calendar supports years 1801 through 2199");
  }

  const winterThisYear = utcPlus8CivilDate(solarTermInstant(civil.year, SOLAR_TERM.WINTER_SOLSTICE));
  const firstSolsticeYear = date < winterThisYear ? civil.year - 1 : civil.year;
  const firstSolstice = solarTermInstant(firstSolsticeYear, SOLAR_TERM.WINTER_SOLSTICE);
  const secondSolstice = solarTermInstant(firstSolsticeYear + 1, SOLAR_TERM.WINTER_SOLSTICE);
  const firstMonth11 = lunationAtOrBefore(firstSolstice);
  const secondMonth11 = lunationAtOrBefore(secondSolstice);
  const monthCount = secondMonth11 - firstMonth11;
  if (monthCount !== 12 && monthCount !== 13) {
    throw new Error(`Invalid astronomical month sequence: ${monthCount}`);
  }

  const leapIndex = monthCount === 13 ? findLeapMonthIndex(firstMonth11, monthCount) : -1;
  const spans = buildMonthSpans(firstMonth11, monthCount, leapIndex);
  const newYearIndex = spans.findIndex((span) => span.month === 1 && !span.leap);
  if (newYearIndex < 0) {
    throw new Error("Lunar new year was not found");
  }
  const lunarYear = parseCivil(spans[newYearIndex].startDate).year;

  for (let index = 0; index < spans.length; index++) {
    const span = spans[index];
    if (date >= span.startDate && date < span.endDate) {
      const year = index < newYearIndex ? lunarYear - 1 : lunarYear;
      const day = daysBetween(span.startDate, date) + 1;
      const daysInMonth = daysBetween(span.startDate, span.endDate);
      return {
        year,
        month: span.month,
        day,
        leapMonth: span.leap,
        daysInMonth,
        monthStartDate: span.startDate,
        astronomicalNewMoon: span.newMoon,
        display: `${chineseYear(year)}年${span.leap ? "闰" : ""}${MONTH_NAMES[span.month]}${DAY_NAMES[day]}`,
      };
    }
  }
  throw new Error(`Date ${date} did not fall in the calculated lunisolar year`);
}

export function cycleFromIndex(index) {
  const normalized = mod(index, 60);
  return {
    index: normalized,
    stemIndex: normalized % 10,
    branchIndex: normalized % 12,
    name: STEMS[normalized % 10] + BRANCHES[normalized % 12],
    zodiac: ZODIAC[normalized % 12],
    naYin: NAYIN[Math.floor(normalized / 2)],
  };
}

function cycleFromStemBranch(stemIndex, branchIndex) {
  for (let index = 0; index < 60; index++) {
    if (index % 10 === stemIndex && index % 12 === branchIndex) {
      return cycleFromIndex(index);
    }
  }
  throw new Error(`Invalid stem-branch pairing: ${stemIndex}/${branchIndex}`);
}

export function calculatePillars(now, date, solarLongitude = longitudeAt(now)) {
  const local = utcPlus8Parts(now);
  const startOfSpring = solarTermInstant(local.year, SOLAR_TERM.START_OF_SPRING);
  const cycleYear = now.getTime() < startOfSpring.getTime() ? local.year - 1 : local.year;
  const year = cycleFromIndex(mod(cycleYear - 4, 60));
  const ordinal = Math.floor(mod(solarLongitude - 315, 360) / 30);
  const monthBranch = (2 + ordinal) % 12;
  const monthStem = mod(year.stemIndex * 2 + 2 + ordinal, 10);
  const month = cycleFromStemBranch(monthStem, monthBranch);
  const day = cycleFromIndex(mod(julianDayNumber(date) + 49, 60));
  const hourBranch = Math.floor((local.hour + 1) / 2) % 12;
  const hourStem = mod(day.stemIndex * 2 + hourBranch, 10);
  const hour = cycleFromStemBranch(hourStem, hourBranch);
  return { year, month, day, hour };
}

function inArc(longitude, start, end) {
  return start < end
    ? longitude >= start && longitude < end
    : longitude >= start || longitude < end;
}

function season(longitude) {
  if (inArc(longitude, 315, 45)) return "春季";
  if (inArc(longitude, 45, 135)) return "夏季";
  if (inArc(longitude, 135, 225)) return "秋季";
  return "冬季";
}

function termDate(year, term) {
  return utcPlus8CivilDate(solarTermInstant(year, term));
}

function activePeriod(name, startDate, endDate, date, sourceId) {
  const dayIndex = daysBetween(startDate, date) + 1;
  const totalDays = daysBetween(startDate, endDate) + 1;
  return {
    active: true,
    name,
    dayIndex,
    totalDays,
    startDate,
    endDate,
    description: `${name}第${dayIndex}天，共${totalDays}天`,
    sourceId,
  };
}

function nthStemDay(startDate, stemIndex, occurrence) {
  let cursor = startDate;
  let found = 0;
  while (true) {
    if (cycleFromIndex(mod(julianDayNumber(cursor) + 49, 60)).stemIndex === stemIndex) {
      found++;
      if (found === occurrence) {
        return cursor;
      }
    }
    cursor = addCivilDays(cursor, 1);
  }
}

function calculateSanFu(date) {
  const year = parseCivil(date).year;
  const summerSolstice = termDate(year, SOLAR_TERM.SUMMER_SOLSTICE);
  const startOfAutumn = termDate(year, SOLAR_TERM.START_OF_AUTUMN);
  const earlyFu = nthStemDay(summerSolstice, 6, 3);
  const middleFu = nthStemDay(summerSolstice, 6, 4);
  const lateFu = nthStemDay(startOfAutumn, 6, 1);
  const end = addCivilDays(lateFu, 9);
  if (date < earlyFu || date > end) {
    return {
      active: false,
      name: null,
      dayIndex: null,
      totalDays: null,
      startDate: earlyFu,
      endDate: end,
      description: "夏至后第三个庚日起初伏，第四个庚日起中伏，立秋后首个庚日起末伏。",
      sourceId: "YUDING_XINGLI_KAOYUAN_VOLUME_5",
    };
  }
  if (date < middleFu) {
    return activePeriod("初伏", earlyFu, addCivilDays(middleFu, -1), date, "YUDING_XINGLI_KAOYUAN_VOLUME_5");
  }
  if (date < lateFu) {
    return activePeriod("中伏", middleFu, addCivilDays(lateFu, -1), date, "YUDING_XINGLI_KAOYUAN_VOLUME_5");
  }
  return activePeriod("末伏", lateFu, end, date, "YUDING_XINGLI_KAOYUAN_VOLUME_5");
}

function calculateShuJiuVariant(date, startOffset, convention, sourceId) {
  let year = parseCivil(date).year;
  let winterSolstice = termDate(year, SOLAR_TERM.WINTER_SOLSTICE);
  if (date < winterSolstice) {
    winterSolstice = termDate(year - 1, SOLAR_TERM.WINTER_SOLSTICE);
  }
  const startDate = addCivilDays(winterSolstice, startOffset);
  const endDate = addCivilDays(startDate, 80);
  if (date < startDate || date > endDate) {
    let next = termDate(year, SOLAR_TERM.WINTER_SOLSTICE);
    if (date >= next) {
      next = termDate(year + 1, SOLAR_TERM.WINTER_SOLSTICE);
    }
    const nextStart = addCivilDays(next, startOffset);
    return {
      active: false,
      name: null,
      dayIndex: null,
      totalDays: null,
      startDate: nextStart,
      endDate: addCivilDays(nextStart, 80),
      description: `${convention}，每九日为一九，共九九八十一日。`,
      sourceId,
    };
  }
  const overallDay = daysBetween(startDate, date) + 1;
  const nine = Math.floor((overallDay - 1) / 9) + 1;
  const dayInNine = (overallDay - 1) % 9 + 1;
  const name = `${"一二三四五六七八九"[nine - 1]}九`;
  return {
    active: true,
    name,
    dayIndex: dayInNine,
    totalDays: 9,
    startDate: addCivilDays(startDate, (nine - 1) * 9),
    endDate: addCivilDays(startDate, nine * 9 - 1),
    description: `${convention}：${name}第${dayInNine}天（数九总第${overallDay}天）`,
    sourceId,
  };
}

function calculateSolarTermStatus(now) {
  const year = utcPlus8Parts(now).year;
  const events = [];
  for (let currentYear = year - 1; currentYear <= year + 1; currentYear++) {
    for (const term of SOLAR_TERMS) {
      events.push({ term, instant: solarTermInstant(currentYear, term) });
    }
  }
  events.sort((left, right) => left.instant.getTime() - right.instant.getTime());
  let previous;
  let next;
  for (const event of events) {
    if (event.instant.getTime() <= now.getTime()) {
      previous = event;
    } else {
      next = event;
      break;
    }
  }
  if (!previous || !next) {
    throw new Error("Unable to bracket time with solar terms");
  }
  const currentDate = utcPlus8CivilDate(now);
  const previousDate = utcPlus8CivilDate(previous.instant);
  const nextDate = utcPlus8CivilDate(next.instant);
  const todayTerm = currentDate === previousDate
    ? previous.term.name
    : currentDate === nextDate ? next.term.name : null;
  return {
    currentPeriod: previous.term.name,
    todayTerm,
    dayInPeriod: daysBetween(previousDate, currentDate) + 1,
    daysUntilNext: daysBetween(currentDate, nextDate),
    previous: { name: previous.term.name, at: formatUtcPlus8(previous.instant) },
    next: { name: next.term.name, at: formatUtcPlus8(next.instant) },
    sourceId: "GB_T_33661_2017",
  };
}

export function calculateSeasonal(now, solarLongitude = longitudeAt(now)) {
  const date = utcPlus8CivilDate(now);
  const primary = calculateShuJiuVariant(
    date,
    1,
    "冬至次日起数",
    "SUISHI_GUANGJI_VOLUME_10",
  );
  const wuCustom = calculateShuJiuVariant(
    date,
    0,
    "冬至日起数",
    "QINGJIALU_VOLUME_4",
  );
  return {
    season: season(solarLongitude),
    solarTerm: calculateSolarTermStatus(now),
    sanFu: calculateSanFu(date),
    shuJiu: {
      primaryConvention: "冬至次日起数（较早文献口径）",
      primary,
      variants: [primary, wuCustom],
      note: "古籍存在两种起数口径，结果并列而不强行混同。",
    },
  };
}
