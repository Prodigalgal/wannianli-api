package cn.wannianli.calendar.astronomy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;

public final class JulianDate {

    public static final double UNIX_EPOCH = 2_440_587.5;
    private static final double SECONDS_PER_DAY = 86_400.0;

    private JulianDate() {
    }

    public static double fromInstant(Instant instant) {
        return UNIX_EPOCH + instant.getEpochSecond() / SECONDS_PER_DAY
                + instant.getNano() / 1_000_000_000.0 / SECONDS_PER_DAY;
    }

    public static Instant toInstant(double julianDate) {
        double epochSeconds = (julianDate - UNIX_EPOCH) * SECONDS_PER_DAY;
        long seconds = (long) Math.floor(epochSeconds);
        long nanos = Math.round((epochSeconds - seconds) * 1_000_000_000.0);
        if (nanos == 1_000_000_000L) {
            seconds++;
            nanos = 0;
        }
        return Instant.ofEpochSecond(seconds, nanos);
    }

    /** Gregorian calendar Julian day number at local noon. */
    public static long dayNumber(LocalDate date) {
        int a = (14 - date.getMonthValue()) / 12;
        int y = date.getYear() + 4_800 - a;
        int m = date.getMonthValue() + 12 * a - 3;
        return date.getDayOfMonth()
                + (153L * m + 2) / 5
                + 365L * y
                + y / 4L
                - y / 100L
                + y / 400L
                - 32_045L;
    }

    public static double decimalYear(Instant instant) {
        var utc = instant.atZone(ZoneOffset.UTC);
        int length = utc.toLocalDate().lengthOfYear();
        double day = utc.getDayOfYear() - 1
                + utc.toLocalTime().toSecondOfDay() / SECONDS_PER_DAY;
        return utc.getYear() + day / length;
    }
}
