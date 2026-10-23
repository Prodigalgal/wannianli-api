import table from "../../src/main/resources/rules/core-gods.json" with { type: "json" };

export const godRules = table.rules;
export const aversionAvoids = godRules.find(entry => entry.id === "MONTH_AVERSION").avoids;
export const noSalaryAllowed = table.noSalary.allowedActivities;
export function isNoSalary(year, month, day, longitude, good) {
  const rule = table.noSalary;
  if (!rule.candidates.includes(day.name)) return false;
  if (day.name === "癸亥") return true;
  const salary = rule.salaryBranches[day.stemIndex];
  const solarBranch = ((22 - Math.floor(longitude / 30)) % 12 + 12) % 12;
  if (good.some(name => ["天德", "月德"].includes(name)) || [year.branchIndex, month.branchIndex, solarBranch].includes(salary)
      || [year.stemIndex, month.stemIndex].includes(day.stemIndex)) return false;
  return !rule.yearMonthRelief.some(entry => entry.years.includes(year.stemIndex)
    && entry.months.includes(month.branchIndex) && entry.day === day.name);
}
export function matchesGod(entry, month, day) {
  const ordinal = (month.branchIndex + 10) % 12, season = Math.floor(ordinal / 3);
  const index = entry.monthBranchOrigin === 0 ? month.branchIndex : ordinal;
  return entry.days?.includes(day.name) || entry.branches?.includes(day.branchIndex)
    || entry.seasonDays?.[season].includes(day.name) || entry.seasonBranches?.[season].includes(day.branchIndex)
    || entry.monthDays?.[index].includes(day.name) || entry.monthBranches?.[index].includes(day.branchIndex)
    || entry.monthStems?.[index].includes(day.stemIndex) || false;
}
export function addCoreGods(good, bad, month, day, year, longitude) {
  for (const entry of godRules) {
    if (!matchesGod(entry, month, day)) continue;
    if (entry.contextual && (!year || !isNoSalary(year, month, day, longitude, good))) continue;
    const target = entry.nature === "good" ? good : bad;
    if (!target.includes(entry.name)) target.push(entry.name);
    const alias = entry.seasonAliases?.[Math.floor((month.branchIndex + 10) % 12 / 3)];
    if (alias && !target.includes(alias)) target.push(alias);
  }
}
export function coreGodHits(month, day, almanac) {
  const good = almanac.gods.auspicious, bad = almanac.gods.inauspicious;
  const hits = [];
  for (const entry of godRules) {
    if (!(entry.nature === "good" ? good : bad).includes(entry.name)) continue;
    const id = entry.soft ? entry.id : "CLASSICAL_RAW_" + entry.id;
    const base = { ruleId: id, name: entry.name, category: entry.nature === "good" ? "吉神" : "凶煞",
      sourceId: "XIEJI_BIANFANGSHU_VOLUME_10", evidenceLevel: "B_PRIMARY_TEXT_TRANSCRIPTION",
      recommends: entry.recommends, avoids: entry.avoids, matchedBecause: "卷五最终校订起例或卷十逐月起例",
      note: "共享表保留原始用事；明确解忌仅撤销本条，其他专忌保留。" };
    hits.push(base);
    const hard = entry.hardExceptions?.some(condition => condition.months.includes(month.branchIndex) && condition.days.includes(day.name));
    if (hard) hits.push({ ...base, ruleId: entry.id + "_HARD_RETAINED_TABOOS", recommends: [], note: "卷十六月己未阳错、己巳阴错，不从德合所宜。" });
    if (entry.soft || !entry.avoids.length) continue;
    const relieved = entry.delegateTo?.some(name => bad.includes(name)) || entry.relief?.some(condition =>
      (!condition.months || condition.months.includes(month.branchIndex)) && condition.anyGood.some(name => good.includes(name)));
    const remaining = relieved ? entry.retainedOnRelief ?? [] : entry.avoids;
    if (remaining.length) hits.push({ ...base, ruleId: "CLASSICAL_ACTIVE_" + entry.id + "_RETAINED_TABOOS",
      recommends: [], avoids: remaining, note: relieved ? "明确解忌后仍保留的用事。" : "未满足本条指定解忌条件，不能用通用日等解除。" });
  }
  return hits;
}
