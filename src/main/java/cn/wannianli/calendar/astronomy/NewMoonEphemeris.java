package cn.wannianli.calendar.astronomy;

import static java.lang.Math.PI;
import static java.lang.Math.sin;

import java.time.Instant;

public final class NewMoonEphemeris {

    private static final double BASE_NEW_MOON = 2_451_550.09765;
    private static final double SYNODIC_MONTH = 29.530588853;

    private NewMoonEphemeris() {
    }

    public static int lunationAtOrBefore(Instant instant) {
        double jde = SolarEphemeris.toTerrestrialTime(JulianDate.fromInstant(instant), instant);
        int k = (int) Math.floor((jde - BASE_NEW_MOON) / SYNODIC_MONTH);
        while (newMoonInstant(k + 1).compareTo(instant) <= 0) {
            k++;
        }
        while (newMoonInstant(k).compareTo(instant) > 0) {
            k--;
        }
        return k;
    }

    public static Instant newMoonInstant(int k) {
        double t = k / 1236.85;
        double t2 = t * t;
        double t3 = t2 * t;
        double t4 = t3 * t;
        double jde = BASE_NEW_MOON + SYNODIC_MONTH * k + 0.0001337 * t2
                - 0.000000150 * t3 + 0.00000000073 * t4;

        double e = 1 - 0.002516 * t - 0.0000074 * t2;
        double m = radians(normalize(2.5534 + 29.10535670 * k - 0.0000014 * t2 - 0.00000011 * t3));
        double moonAnomaly = radians(normalize(201.5643 + 385.81693528 * k + 0.0107582 * t2
                + 0.00001238 * t3 - 0.000000058 * t4));
        double argumentLatitude = radians(normalize(160.7108 + 390.67050284 * k - 0.0016118 * t2
                - 0.00000227 * t3 + 0.000000011 * t4));
        double omega = radians(normalize(124.7746 - 1.56375580 * k + 0.0020672 * t2 + 0.00000215 * t3));

        double correction = -0.40720 * sin(moonAnomaly)
                + 0.17241 * e * sin(m)
                + 0.01608 * sin(2 * moonAnomaly)
                + 0.01039 * sin(2 * argumentLatitude)
                + 0.00739 * e * sin(moonAnomaly - m)
                - 0.00514 * e * sin(moonAnomaly + m)
                + 0.00208 * e * e * sin(2 * m)
                - 0.00111 * sin(moonAnomaly - 2 * argumentLatitude)
                - 0.00057 * sin(moonAnomaly + 2 * argumentLatitude)
                + 0.00056 * e * sin(2 * moonAnomaly + m)
                - 0.00042 * sin(3 * moonAnomaly)
                + 0.00042 * e * sin(m + 2 * argumentLatitude)
                + 0.00038 * e * sin(m - 2 * argumentLatitude)
                - 0.00024 * e * sin(2 * moonAnomaly - m)
                - 0.00017 * sin(omega)
                - 0.00007 * sin(moonAnomaly + 2 * m)
                + 0.00004 * sin(2 * moonAnomaly - 2 * argumentLatitude)
                + 0.00004 * sin(3 * m)
                + 0.00003 * sin(moonAnomaly + m - 2 * argumentLatitude)
                + 0.00003 * sin(2 * moonAnomaly + 2 * argumentLatitude)
                - 0.00003 * sin(moonAnomaly + m + 2 * argumentLatitude)
                + 0.00003 * sin(moonAnomaly - m + 2 * argumentLatitude)
                - 0.00002 * sin(moonAnomaly - m - 2 * argumentLatitude)
                - 0.00002 * sin(3 * moonAnomaly + m)
                + 0.00002 * sin(4 * moonAnomaly);

        double planetary = 0.000325 * sine(299.77 + 0.107408 * k - 0.009173 * t2)
                + 0.000165 * sine(251.88 + 0.016321 * k)
                + 0.000164 * sine(251.83 + 26.651886 * k)
                + 0.000126 * sine(349.42 + 36.412478 * k)
                + 0.000110 * sine(84.66 + 18.206239 * k)
                + 0.000062 * sine(141.74 + 53.303771 * k)
                + 0.000060 * sine(207.14 + 2.453732 * k)
                + 0.000056 * sine(154.84 + 7.306860 * k)
                + 0.000047 * sine(34.52 + 27.261239 * k)
                + 0.000042 * sine(207.19 + 0.121824 * k)
                + 0.000040 * sine(291.34 + 1.844379 * k)
                + 0.000037 * sine(161.72 + 24.198154 * k)
                + 0.000035 * sine(239.56 + 25.513099 * k)
                + 0.000023 * sine(331.55 + 3.592518 * k);

        jde += correction + planetary;
        double approximateYear = 2000 + k / 12.3685;
        return SolarEphemeris.terrestrialTimeToInstant(jde, approximateYear);
    }

    private static double sine(double degrees) {
        return sin(radians(normalize(degrees)));
    }

    private static double radians(double degrees) {
        return degrees * PI / 180.0;
    }

    private static double normalize(double degrees) {
        double value = degrees % 360.0;
        return value < 0 ? value + 360 : value;
    }
}
