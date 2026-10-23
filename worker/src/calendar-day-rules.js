import table from "../../src/main/resources/rules/calendar-days.json" with { type: "json" };
import { SOLAR_TERM, addCivilDays, julianDayNumber, mod, solarTermInstant, utcPlus8CivilDate } from "./astronomy.js";

const hit = (entry, name, reason) => ({
  ruleId: entry.id, name, category: "历日专例", sourceId: "XIEJI_BIANFANGSHU_VOLUME_10",
  evidenceLevel: "B_PRIMARY_TEXT_TRANSCRIPTION", recommends: [], avoids: entry.avoids ?? [],
  matchedBecause: reason, note: entry.note,
});

export function calendarDayRules(date, lunar) {
  const year = Number(date.slice(0, 4)), hits = [];
  for (const entry of table.qiGoingLoss.terms) {
    const start = utcPlus8CivilDate(solarTermInstant(year, SOLAR_TERM[entry.term]));
    if (date === addCivilDays(start, entry.inclusiveDay - 1)) {
      hits.push(hit(table.qiGoingLoss, table.qiGoingLoss.name, `${start}交${SOLAR_TERM[entry.term].name}，含首日第${entry.inclusiveDay}日`));
      break;
    }
  }
  const firstBranch = mod(julianDayNumber(lunar.monthStartDate) + 49, 12);
  if (lunar.day === table.reversedBranch.lunarDayByNewMoonBranch[firstBranch])
    hits.push(hit(table.reversedBranch, table.reversedBranch.name, `本月朔日${lunar.monthStartDate}地支索引${firstBranch}，农历第${lunar.day}日`));
  for (const key of table.equinoxSolstice.terms) {
    if (date === utcPlus8CivilDate(solarTermInstant(year, SOLAR_TERM[key])))
      hits.push(hit(table.equinoxSolstice, SOLAR_TERM[key].name, `交${SOLAR_TERM[key].name}所在UTC+08:00民用日`));
  }
  if (table.monthlyTaboo.lunarDays.includes(lunar.day))
    hits.push(hit(table.monthlyTaboo, table.monthlyTaboo.name, `农历第${lunar.day}日${lunar.leapMonth ? "（闰月）" : ""}`));
  return { names: hits.map(entry => entry.name), hits };
}

export function calendarAnnotationOmissions(hits, activities) {
  const omitted = new Set();
  if (hits.some(entry => entry.ruleId === table.monthlyTaboo.id))
    for (const activity of activities) if (!table.monthlyTaboo.allowedActivities.includes(activity)) omitted.add(activity);
  const term = hits.find(entry => entry.ruleId === table.equinoxSolstice.id);
  if (term) {
    for (const activity of table.equinoxSolstice.omittedActivities) omitted.add(activity);
    if (term.name === "冬至") for (const activity of table.equinoxSolstice.winterAdditionalOmissions) omitted.add(activity);
  }
  return omitted;
}
