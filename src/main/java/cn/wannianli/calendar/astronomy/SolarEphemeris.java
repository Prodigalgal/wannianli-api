package cn.wannianli.calendar.astronomy;

import static java.lang.Math.PI;
import static java.lang.Math.sin;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

public final class SolarEphemeris {

    private static final double J2000 = 2_451_545.0;
    private static final double MEAN_DAILY_MOTION = 0.98564736;

    private SolarEphemeris() {
    }

    public static Instant solarTermInstant(int year, SolarTerm term, ZoneId referenceZone) {
        Instant seed = LocalDateTime.of(year, term.approximateMonth(), term.approximateDay(), 12, 0)
                .atZone(referenceZone)
                .toInstant();
        double jde = toTerrestrialTime(JulianDate.fromInstant(seed), seed);

        for (int i = 0; i < 12; i++) {
            double error = signedDegrees(term.longitude() - apparentSolarLongitude(jde));
            jde += error / MEAN_DAILY_MOTION;
            if (Math.abs(error) < 1.0e-8) {
                break;
            }
        }
        return terrestrialTimeToInstant(jde, year + (term.approximateMonth() - 0.5) / 12.0);
    }

    /** Apparent geocentric solar ecliptic longitude in degrees, referred to the true equinox. */
    public static double apparentSolarLongitude(double julianEphemerisDay) {
        double t = (julianEphemerisDay - J2000) / 36_525.0;
        double meanLongitude = normalize(280.46646 + 36_000.76983 * t + 0.0003032 * t * t);
        double meanAnomaly = normalize(357.52911 + 35_999.05029 * t - 0.0001537 * t * t
                + t * t * t / 24_490_000.0);
        double anomalyRadians = radians(meanAnomaly);
        double equationOfCenter = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sin(anomalyRadians)
                + (0.019993 - 0.000101 * t) * sin(2 * anomalyRadians)
                + 0.000289 * sin(3 * anomalyRadians);
        double trueLongitude = meanLongitude + equationOfCenter;
        double omega = radians(125.04 - 1934.136 * t);
        return normalize(trueLongitude - 0.00569 - 0.00478 * sin(omega));
    }

    public static double longitudeAt(Instant instant) {
        return apparentSolarLongitude(toTerrestrialTime(JulianDate.fromInstant(instant), instant));
    }

    public static double toTerrestrialTime(double universalJulianDate, Instant instant) {
        return universalJulianDate + DeltaT.seconds(JulianDate.decimalYear(instant)) / 86_400.0;
    }

    static Instant terrestrialTimeToInstant(double jde, double decimalYear) {
        return JulianDate.toInstant(jde - DeltaT.seconds(decimalYear) / 86_400.0);
    }

    public static double normalize(double degrees) {
        double value = degrees % 360.0;
        return value < 0 ? value + 360.0 : value;
    }

    static double signedDegrees(double degrees) {
        double value = normalize(degrees);
        return value > 180 ? value - 360 : value;
    }

    private static double radians(double degrees) {
        return degrees * PI / 180.0;
    }
}
