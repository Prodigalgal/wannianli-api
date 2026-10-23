import { isObject, semanticInstant, semanticResult } from "./semantic.js";
import { calculateCurrentAlmanac } from "./engine.js";
import { ApiError } from "./request.js";

export const RANGE_MAX_DAYS = 14, RANGE_MAX_BYTES = 262144;
export async function rangeResult(input, charge, headersOnly = false) {
  if (!isObject(input) || Object.keys(input).some(key => !["startDate", "endDate", "time"].includes(key)))
    throw new ApiError(400, "区间仅接受startDate、endDate和time");
  const { startDate, endDate, time = "00:00:00" } = input;
  const start = semanticInstant({ date: startDate, time }), end = semanticInstant({ date: endDate, time });
  const days = (end.getTime() - start.getTime()) / 86400000 + 1;
  if (days < 1 || days > RANGE_MAX_DAYS) throw new ApiError(400, "区间必须按公历升序，含首尾最多14天");
  if (headersOnly) return null;
  await charge(days - 1);
  const value = { schemaVersion: "2.0", utcOffset: "+08:00",
    range: { startDate, endDate, time: time.length === 5 ? time + ":00" : time, days, quotaUnits: days },
    results: Array.from({ length: days }, (_, i) => semanticResult(calculateCurrentAlmanac(new Date(start.getTime() + i * 86400000)))) };
  if (new TextEncoder().encode(JSON.stringify(value)).length > RANGE_MAX_BYTES) throw new ApiError(413, "区间结果超过262144字节上限，请缩小区间");
  return value;
}
