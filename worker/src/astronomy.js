export const MS_PER_DAY = 86_400_000;
export const UTC_PLUS_8_MS = 8 * 60 * 60 * 1000;

const JULIAN_UNIX_EPOCH = 2_440_587.5;
const J2000 = 2_451_545.0;
const MEAN_DAILY_MOTION = 0.98564736;
const BASE_NEW_MOON = 2_451_550.09765;
const SYNODIC_MONTH = 29.530588853;

export const SOLAR_TERMS = Object.freeze([
  { key: "MINOR_COLD", name: "小寒", longitude: 285, month: 1, day: 5 },
  { key: "MAJOR_COLD", name: "大寒", longitude: 300, month: 1, day: 20 },
  { key: "START_OF_SPRING", name: "立春", longitude: 315, month: 2, day: 4 },
  { key: "RAIN_WATER", name: "雨水", longitude: 330, month: 2, day: 19 },
  { key: "AWAKENING_OF_INSECTS", name: "惊蛰", longitude: 345, month: 3, day: 5 },
  { key: "SPRING_EQUINOX", name: "春分", longitude: 0, month: 3, day: 20 },
  { key: "PURE_BRIGHTNESS", name: "清明", longitude: 15, month: 4, day: 5 },
  { key: "GRAIN_RAIN", name: "谷雨", longitude: 30, month: 4, day: 20 },
  { key: "START_OF_SUMMER", name: "立夏", longitude: 45, month: 5, day: 5 },
  { key: "GRAIN_FULL", name: "小满", longitude: 60, month: 5, day: 21 },
  { key: "GRAIN_IN_EAR", name: "芒种", longitude: 75, month: 6, day: 5 },
  { key: "SUMMER_SOLSTICE", name: "夏至", longitude: 90, month: 6, day: 21 },
  { key: "MINOR_HEAT", name: "小暑", longitude: 105, month: 7, day: 7 },
  { key: "MAJOR_HEAT", name: "大暑", longitude: 120, month: 7, day: 23 },
  { key: "START_OF_AUTUMN", name: "立秋", longitude: 135, month: 8, day: 7 },
  { key: "END_OF_HEAT", name: "处暑", longitude: 150, month: 8, day: 23 },
  { key: "WHITE_DEW", name: "白露", longitude: 165, month: 9, day: 7 },
  { key: "AUTUMN_EQUINOX", name: "秋分", longitude: 180, month: 9, day: 23 },
  { key: "COLD_DEW", name: "寒露", longitude: 195, month: 10, day: 8 },
  { key: "FROST_DESCENT", name: "霜降", longitude: 210, month: 10, day: 23 },
  { key: "START_OF_WINTER", name: "立冬", longitude: 225, month: 11, day: 7 },
  { key: "MINOR_SNOW", name: "小雪", longitude: 240, month: 11, day: 22 },
  { key: "MAJOR_SNOW", name: "大雪", longitude: 255, month: 12, day: 7 },
  { key: "WINTER_SOLSTICE", name: "冬至", longitude: 270, month: 12, day: 21 },
]);

export const SOLAR_TERM = Object.freeze(
  Object.fromEntries(SOLAR_TERMS.map((term) => [term.key, term])),
);

const solarTermCache = new Map();
const newMoonCache = new Map();

export function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function normalizeDegrees(degrees) {
  return mod(degrees, 360);
}

function signedDegrees(degrees) {
  const value = normalizeDegrees(degrees);
  return value > 180 ? value - 360 : value;
}

function pad(value, width = 2) {
  return String(value).padStart(width, "0");
}

export function utcPlus8Parts(instant) {
  const shifted = new Date(instant.getTime() + UTC_PLUS_8_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    millisecond: shifted.getUTCMilliseconds(),
  };
}

export function instantFromUtcPlus8(year, month, day, hour = 0, minute = 0, second = 0, millisecond = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute, second, millisecond));
}

export function formatUtcPlus8(instant) {
  const value = utcPlus8Parts(instant);
  return `${pad(value.year, 4)}-${pad(value.month)}-${pad(value.day)}T${pad(value.hour)}:${pad(value.minute)}:${pad(value.second)}.${pad(value.millisecond, 3)}+08:00`;
}

export function formatCivil(year, month, day) {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export function parseCivil(date) {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

export function utcPlus8CivilDate(instant) {
  const value = utcPlus8Parts(instant);
  return formatCivil(value.year, value.month, value.day);
}

export function addCivilDays(date, days) {
  const value = parseCivil(date);
  const shifted = new Date(Date.UTC(value.year, value.month - 1, value.day + days));
  return formatCivil(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function daysBetween(start, end) {
  const first = parseCivil(start);
  const second = parseCivil(end);
  return Math.round(
    (Date.UTC(second.year, second.month - 1, second.day) - Date.UTC(first.year, first.month - 1, first.day))
      / MS_PER_DAY,
  );
}

export function julianDayNumber(date) {
  const value = parseCivil(date);
  const a = Math.floor((14 - value.month) / 12);
  const y = value.year + 4_800 - a;
  const m = value.month + 12 * a - 3;
  return value.day
    + Math.floor((153 * m + 2) / 5)
    + 365 * y
    + Math.floor(y / 4)
    - Math.floor(y / 100)
    + Math.floor(y / 400)
    - 32_045;
}

export function julianDateFromInstant(instant) {
  return JULIAN_UNIX_EPOCH + instant.getTime() / MS_PER_DAY;
}

function instantFromJulianDate(julianDate) {
  return new Date(Math.round((julianDate - JULIAN_UNIX_EPOCH) * MS_PER_DAY));
}

function decimalYear(instant) {
  const year = instant.getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  return year + (instant.getTime() - start) / (end - start);
}

export function deltaTSeconds(year) {
  if (year < 1800 || year > 2200) {
    throw new RangeError("Delta-T supports years 1800 through 2200");
  }
  if (year < 1860) {
    const t = year - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t ** 2 + 0.0041116 * t ** 3
      - 0.00037436 * t ** 4 + 0.0000121272 * t ** 5
      - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  }
  if (year < 1900) {
    const t = year - 1860;
    return 7.62 + 0.5737 * t - 0.251754 * t ** 2 + 0.01680668 * t ** 3
      - 0.0004473624 * t ** 4 + t ** 5 / 233_174;
  }
  if (year < 1920) {
    const t = year - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t ** 2 + 0.0061966 * t ** 3
      - 0.000197 * t ** 4;
  }
  if (year < 1941) {
    const t = year - 1920;
    return 21.20 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (year < 1961) {
    const t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year < 2005) {
    const t = year - 2000;
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3
      + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  }
  if (year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  if (year < 2150) {
    const u = (year - 1820) / 100;
    return -20 + 32 * u ** 2 - 0.5628 * (2150 - year);
  }
  const u = (year - 1820) / 100;
  return -20 + 32 * u ** 2;
}

function toTerrestrialTime(universalJulianDate, instant) {
  return universalJulianDate + deltaTSeconds(decimalYear(instant)) / 86_400;
}

function terrestrialTimeToInstant(jde, approximateYear) {
  return instantFromJulianDate(jde - deltaTSeconds(approximateYear) / 86_400);
}

export function apparentSolarLongitude(julianEphemerisDay) {
  const t = (julianEphemerisDay - J2000) / 36_525;
  const meanLongitude = normalizeDegrees(280.46646 + 36_000.76983 * t + 0.0003032 * t * t);
  const meanAnomaly = normalizeDegrees(
    357.52911 + 35_999.05029 * t - 0.0001537 * t * t + t ** 3 / 24_490_000,
  );
  const anomaly = meanAnomaly * Math.PI / 180;
  const equation = (1.914602 - 0.004817 * t - 0.000014 * t * t) * Math.sin(anomaly)
    + (0.019993 - 0.000101 * t) * Math.sin(2 * anomaly)
    + 0.000289 * Math.sin(3 * anomaly);
  const omega = (125.04 - 1934.136 * t) * Math.PI / 180;
  return normalizeDegrees(meanLongitude + equation - 0.00569 - 0.00478 * Math.sin(omega));
}

export function longitudeAt(instant) {
  return apparentSolarLongitude(toTerrestrialTime(julianDateFromInstant(instant), instant));
}

export function solarTermInstant(year, term) {
  const cacheKey = `${year}:${term.key}`;
  if (solarTermCache.has(cacheKey)) {
    return solarTermCache.get(cacheKey);
  }
  const seed = instantFromUtcPlus8(year, term.month, term.day, 12);
  let jde = toTerrestrialTime(julianDateFromInstant(seed), seed);
  for (let index = 0; index < 12; index++) {
    const error = signedDegrees(term.longitude - apparentSolarLongitude(jde));
    jde += error / MEAN_DAILY_MOTION;
    if (Math.abs(error) < 1e-8) {
      break;
    }
  }
  const result = terrestrialTimeToInstant(jde, year + (term.month - 0.5) / 12);
  solarTermCache.set(cacheKey, result);
  return result;
}

function sineDegrees(degrees) {
  return Math.sin(normalizeDegrees(degrees) * Math.PI / 180);
}

export function newMoonInstant(k) {
  if (newMoonCache.has(k)) {
    return newMoonCache.get(k);
  }
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  let jde = BASE_NEW_MOON + SYNODIC_MONTH * k + 0.0001337 * t2
    - 0.000000150 * t3 + 0.00000000073 * t4;

  const e = 1 - 0.002516 * t - 0.0000074 * t2;
  const radians = (degrees) => normalizeDegrees(degrees) * Math.PI / 180;
  const m = radians(2.5534 + 29.10535670 * k - 0.0000014 * t2 - 0.00000011 * t3);
  const moonAnomaly = radians(201.5643 + 385.81693528 * k + 0.0107582 * t2
    + 0.00001238 * t3 - 0.000000058 * t4);
  const argumentLatitude = radians(160.7108 + 390.67050284 * k - 0.0016118 * t2
    - 0.00000227 * t3 + 0.000000011 * t4);
  const omega = radians(124.7746 - 1.56375580 * k + 0.0020672 * t2 + 0.00000215 * t3);

  const correction = -0.40720 * Math.sin(moonAnomaly)
    + 0.17241 * e * Math.sin(m)
    + 0.01608 * Math.sin(2 * moonAnomaly)
    + 0.01039 * Math.sin(2 * argumentLatitude)
    + 0.00739 * e * Math.sin(moonAnomaly - m)
    - 0.00514 * e * Math.sin(moonAnomaly + m)
    + 0.00208 * e * e * Math.sin(2 * m)
    - 0.00111 * Math.sin(moonAnomaly - 2 * argumentLatitude)
    - 0.00057 * Math.sin(moonAnomaly + 2 * argumentLatitude)
    + 0.00056 * e * Math.sin(2 * moonAnomaly + m)
    - 0.00042 * Math.sin(3 * moonAnomaly)
    + 0.00042 * e * Math.sin(m + 2 * argumentLatitude)
    + 0.00038 * e * Math.sin(m - 2 * argumentLatitude)
    - 0.00024 * e * Math.sin(2 * moonAnomaly - m)
    - 0.00017 * Math.sin(omega)
    - 0.00007 * Math.sin(moonAnomaly + 2 * m)
    + 0.00004 * Math.sin(2 * moonAnomaly - 2 * argumentLatitude)
    + 0.00004 * Math.sin(3 * m)
    + 0.00003 * Math.sin(moonAnomaly + m - 2 * argumentLatitude)
    + 0.00003 * Math.sin(2 * moonAnomaly + 2 * argumentLatitude)
    - 0.00003 * Math.sin(moonAnomaly + m + 2 * argumentLatitude)
    + 0.00003 * Math.sin(moonAnomaly - m + 2 * argumentLatitude)
    - 0.00002 * Math.sin(moonAnomaly - m - 2 * argumentLatitude)
    - 0.00002 * Math.sin(3 * moonAnomaly + m)
    + 0.00002 * Math.sin(4 * moonAnomaly);

  const planetary = 0.000325 * sineDegrees(299.77 + 0.107408 * k - 0.009173 * t2)
    + 0.000165 * sineDegrees(251.88 + 0.016321 * k)
    + 0.000164 * sineDegrees(251.83 + 26.651886 * k)
    + 0.000126 * sineDegrees(349.42 + 36.412478 * k)
    + 0.000110 * sineDegrees(84.66 + 18.206239 * k)
    + 0.000062 * sineDegrees(141.74 + 53.303771 * k)
    + 0.000060 * sineDegrees(207.14 + 2.453732 * k)
    + 0.000056 * sineDegrees(154.84 + 7.306860 * k)
    + 0.000047 * sineDegrees(34.52 + 27.261239 * k)
    + 0.000042 * sineDegrees(207.19 + 0.121824 * k)
    + 0.000040 * sineDegrees(291.34 + 1.844379 * k)
    + 0.000037 * sineDegrees(161.72 + 24.198154 * k)
    + 0.000035 * sineDegrees(239.56 + 25.513099 * k)
    + 0.000023 * sineDegrees(331.55 + 3.592518 * k);

  jde += correction + planetary;
  const result = terrestrialTimeToInstant(jde, 2000 + k / 12.3685);
  newMoonCache.set(k, result);
  return result;
}

export function lunationAtOrBefore(instant) {
  const jde = toTerrestrialTime(julianDateFromInstant(instant), instant);
  let k = Math.floor((jde - BASE_NEW_MOON) / SYNODIC_MONTH);
  while (newMoonInstant(k + 1).getTime() <= instant.getTime()) {
    k++;
  }
  while (newMoonInstant(k).getTime() > instant.getTime()) {
    k--;
  }
  return k;
}
