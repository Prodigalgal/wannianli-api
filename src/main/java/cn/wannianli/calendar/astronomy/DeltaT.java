package cn.wannianli.calendar.astronomy;

/**
 * Piecewise Espenak-Meeus approximation of TT - UT in seconds.
 * The API only evaluates the current epoch; the wider range supports regression tests.
 */
public final class DeltaT {

    private DeltaT() {
    }

    public static double seconds(double year) {
        if (year < 1800 || year > 2200) {
            throw new IllegalArgumentException("Delta-T implementation supports years 1800 through 2200");
        }
        if (year < 1860) {
            double t = year - 1800;
            return 13.72 - 0.332447 * t + 0.0068612 * pow(t, 2) + 0.0041116 * pow(t, 3)
                    - 0.00037436 * pow(t, 4) + 0.0000121272 * pow(t, 5)
                    - 0.0000001699 * pow(t, 6) + 0.000000000875 * pow(t, 7);
        }
        if (year < 1900) {
            double t = year - 1860;
            return 7.62 + 0.5737 * t - 0.251754 * pow(t, 2) + 0.01680668 * pow(t, 3)
                    - 0.0004473624 * pow(t, 4) + pow(t, 5) / 233_174;
        }
        if (year < 1920) {
            double t = year - 1900;
            return -2.79 + 1.494119 * t - 0.0598939 * pow(t, 2) + 0.0061966 * pow(t, 3)
                    - 0.000197 * pow(t, 4);
        }
        if (year < 1941) {
            double t = year - 1920;
            return 21.20 + 0.84493 * t - 0.0761 * pow(t, 2) + 0.0020936 * pow(t, 3);
        }
        if (year < 1961) {
            double t = year - 1950;
            return 29.07 + 0.407 * t - pow(t, 2) / 233 + pow(t, 3) / 2547;
        }
        if (year < 1986) {
            double t = year - 1975;
            return 45.45 + 1.067 * t - pow(t, 2) / 260 - pow(t, 3) / 718;
        }
        if (year < 2005) {
            double t = year - 2000;
            return 63.86 + 0.3345 * t - 0.060374 * pow(t, 2) + 0.0017275 * pow(t, 3)
                    + 0.000651814 * pow(t, 4) + 0.00002373599 * pow(t, 5);
        }
        if (year < 2050) {
            double t = year - 2000;
            return 62.92 + 0.32217 * t + 0.005589 * pow(t, 2);
        }
        if (year < 2150) {
            double u = (year - 1820) / 100;
            return -20 + 32 * pow(u, 2) - 0.5628 * (2150 - year);
        }
        double u = (year - 1820) / 100;
        return -20 + 32 * pow(u, 2);
    }

    private static double pow(double value, int exponent) {
        return Math.pow(value, exponent);
    }
}
