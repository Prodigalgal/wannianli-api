import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

export const calendarFixture = JSON.parse(await readFile(new URL("../../src/test/resources/fixtures/calendar-days.json", import.meta.url)));
export function isSourceOmitted(result, activity) {
  const names = result.凶煞;
  return names.includes("月忌日") && !calendarFixture.monthlyAllowed.includes(activity)
    || names.some(name => Object.values(calendarFixture.termDates2026).includes(name)) && calendarFixture.termOmissions.includes(activity)
    || names.includes("冬至") && activity === "伐木";
}

export function assertRetainedUnlessUnprinted(result, audit, activity) {
  const decision = audit.activityDecisions.find(d => d.activity === activity);
  assert.ok(decision?.avoidedBy.length > 0, `${result.公历.日期}: original taboo ${activity}`);
  if (isSourceOmitted(result, activity)) {
    assert.equal(decision.disposition, "OMITTED", `${result.公历.日期}: source omission ${activity}`);
    assert.match(decision.rationale, /月忌日止注或分至日不注/u);
    for (const key of ["宜","忌","宜忌并存"]) assert.ok(!result.宜忌[key].includes(activity));
  } else assert.ok(result.宜忌.忌.includes(activity), `${result.公历.日期}: retained taboo ${activity}`);
}
