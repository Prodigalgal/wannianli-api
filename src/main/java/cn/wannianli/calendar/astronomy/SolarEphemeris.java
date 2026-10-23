package cn.wannianli.calendar.astronomy;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.concurrent.ConcurrentHashMap;

public final class SolarEphemeris {

    public static final int MIN_YEAR = 1800;
    public static final int MAX_YEAR = 2200;

    private static final double J2000 = 2_451_545.0;
    private static final double MEAN_DAILY_MOTION = 0.98564736;
    private static final ZoneId CALENDAR_ZONE = ZoneOffset.ofHours(8);
    private static final ConcurrentHashMap<TermKey, Instant> CACHE = new ConcurrentHashMap<>();

    private SolarEphemeris() {
    }

    public static Instant solarTermInstant(int year, SolarTerm term, ZoneId referenceZone) {
        if (year < MIN_YEAR || year > MAX_YEAR) {
            throw new IllegalArgumentException("Solar-term calculation supports years 1800 through 2200");
        }
        if (CALENDAR_ZONE.equals(referenceZone)) {
            return CACHE.computeIfAbsent(new TermKey(year, term),
                    key -> calculateSolarTerm(key.year(), key.term(), referenceZone));
        }
        return calculateSolarTerm(year, term, referenceZone);
    }

    private static Instant calculateSolarTerm(int year, SolarTerm term, ZoneId referenceZone) {
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
        Instant instant = terrestrialTimeToInstant(jde, year + (term.approximateMonth() - 0.5) / 12.0);
        // Refine in UT using the longitudeAt function used by the pillars. An approximate
        // decimal year in the TT -> UT seed must not produce a different year/month boundary.
        for (int i = 0; i < 4; i++) {
            double error = signedDegrees(term.longitude() - longitudeAt(instant));
            instant = instant.plusNanos(Math.round(error / MEAN_DAILY_MOTION * 86_400_000_000_000.0));
        }
        long milliseconds = instant.toEpochMilli();
        if (instant.isAfter(Instant.ofEpochMilli(milliseconds))) milliseconds++;
        instant = Instant.ofEpochMilli(milliseconds);
        // Choose the first millisecond at or after the crossing, consistently in both runtimes.
        for (int i = 0; i < 4 && signedDegrees(longitudeAt(instant) - term.longitude()) < 0; i++) {
            instant = instant.plusMillis(1);
        }
        for (int i = 0; i < 4 && signedDegrees(longitudeAt(instant.minusMillis(1)) - term.longitude()) >= 0; i++) {
            instant = instant.minusMillis(1);
        }
        return instant;
    }

    /** Apparent geocentric solar ecliptic longitude in degrees, referred to the true equinox of date. */
    public static double apparentSolarLongitude(double julianEphemerisDay) {
        double geometricLongitude = normalize(Math.toDegrees(EarthVsop87.longitude(julianEphemerisDay)) + 180.0);
        double radius = EarthVsop87.radius(julianEphemerisDay);
        double nutationLongitude = Nutation1980.longitudeDegrees(julianEphemerisDay);
        double aberration = 20.4898 / (3_600.0 * radius);
        double fk5Correction = 0.09033 / 3_600.0;
        return normalize(geometricLongitude + nutationLongitude - aberration - fk5Correction);
    }

    public static double longitudeAt(Instant instant) {
        return apparentSolarLongitude(toTerrestrialTime(JulianDate.fromInstant(instant), instant));
    }

    public static double toTerrestrialTime(double universalJulianDate, Instant instant) {
        return universalJulianDate + DeltaT.seconds(JulianDate.decimalYear(instant)) / 86_400.0;
    }

    static Instant terrestrialTimeToInstant(double jde, double decimalYear) {
        Instant result = JulianDate.toInstant(jde - DeltaT.seconds(decimalYear) / 86_400.0);
        for (int i = 0; i < 3; i++) {
            result = JulianDate.toInstant(jde - DeltaT.seconds(JulianDate.decimalYear(result)) / 86_400.0);
        }
        return Instant.ofEpochMilli(Math.round(result.getEpochSecond() * 1000.0 + result.getNano() / 1_000_000.0));
    }

    public static double normalize(double degrees) {
        double value = degrees % 360.0;
        return value < 0 ? value + 360.0 : value;
    }

    static double signedDegrees(double degrees) {
        double value = normalize(degrees);
        return value > 180 ? value - 360 : value;
    }

    private record TermKey(int year, SolarTerm term) {
    }
}
