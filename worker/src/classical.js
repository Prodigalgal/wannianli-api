import text from "../../src/main/resources/rules/volume10.json" with { type: "json" };

export const placement = text.placement;
export const recommendSuppressionLinks = text.recommendSuppressionLinks;
export const absoluteCase = (month, day) => text.absoluteDays.find(entry => entry.month === month.branchIndex && entry.days.includes(day.name));
export const pressingCase = (month, day) => text.pressingDays.find(entry => entry.month === month.branchIndex && entry.days.includes(day.name));
export const universalRelief = (month, day) => text.universalReliefDays.some(entry => entry.month === month.branchIndex && entry.day === day.name);
export function monthlyCase(month, almanac) {
  const good = almanac.gods.auspicious;
  const entry = text.monthly.find(entry => entry.officer === almanac.dayOfficer.name && entry.months.includes(month.branchIndex)
    && (!entry.anyGood || entry.anyGood.some(name => good.includes(name))));
  if (!entry) return undefined;
  const pressure = almanac.gods.inauspicious.some(name => ["四废", "岁薄", "逐阵"].includes(name))
    && entry.relieveOnVictory?.some(id => ["HEAVEN_OFFICIAL", "GREAT_TIME"].includes(id));
  return { ...entry, ...(pressure ? { grade: "UNDETERMINED", relieveOnVictory: [] } : {}),
    gradeRelief: entry.reliefGods.some(name => good.includes(name)) };
}
export function fromAvoidGrade(grade, relief) {
  return ["INFERIOR", "LOWEST"].includes(grade)
    || ["MIDDLE", "MIDDLE_SECOND"].includes(grade) && !relief;
}
export function placementSets(hits, grade, relief, day) {
  const suppressRecommend = new Set();
  for (const entry of placement.suppressRecommend) {
    if (hits.some(hit => hit.ruleId === entry.id)) for (const a of entry.activities) suppressRecommend.add(a);
  }
  if (hits.some(hit => hit.ruleId.startsWith("EARTHWORK_"))) suppressRecommend.add("塞穴");
  for (const a of placement.branchSuppression[day.branchIndex] ?? []) suppressRecommend.add(a);
  for (const a of placement.stemSuppression[day.stemIndex] ?? []) suppressRecommend.add(a);
  const benefic = hits.some(hit => placement.beneficNames.includes(hit.name));
  return { suppressRecommend, noAvoid: new Set(benefic && !fromAvoidGrade(grade.key, relief) ? placement.noAvoidOnBenefic : []) };
}
