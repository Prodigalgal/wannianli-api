package cn.wannianli.calendar.astronomy;

/** Generated from ERFA nut80.c (ec968fb295d3cf0572c4f024bf3c5357d9258b7b).
 * https://raw.githubusercontent.com/liberfa/erfa/ec968fb295d3cf0572c4f024bf3c5357d9258b7b/src/nut80.c
 * Source SHA-256: 08c6fda7949eaa04c64c38e52e62183f32bbbe89c1ab2ece564c545c01532ae7
 * Longitude-only port of the complete 106-term IAU 1980 series.
 *
 * Copyright (C) 2013-2023, NumFOCUS Foundation.
 *  All rights reserved.
 *
 *  This library is derived, with permission, from the International
 *  Astronomical Union's "Standards of Fundamental Astronomy" library,
 *  available from http://www.iausofa.org.
 *
 *  The ERFA version is intended to retain identical functionality to
 *  the SOFA library, but made distinct through different function and
 *  file names, as set out in the SOFA license conditions.  The SOFA
 *  original has a role as a reference standard for the IAU and IERS,
 *  and consequently redistribution is permitted only in its unaltered
 *  state.  The ERFA version is not subject to this restriction and
 *  therefore can be included in distributions which do not support the
 *  concept of "read only" software.
 *
 *  Although the intent is to replicate the SOFA API (other than
 *  replacement of prefix names) and results (with the exception of
 *  bugs;  any that are discovered will be fixed), SOFA is not
 *  responsible for any errors found in this version of the library.
 *
 *  If you wish to acknowledge the SOFA heritage, please acknowledge
 *  that you are using a library derived from SOFA, rather than SOFA
 *  itself.
 *
 *
 *  TERMS AND CONDITIONS
 *
 *  Redistribution and use in source and binary forms, with or without
 *  modification, are permitted provided that the following conditions
 *  are met:
 *
 *  1 Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *
 *  2 Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in
 *    the documentation and/or other materials provided with the
 *    distribution.
 *
 *  3 Neither the name of the Standards Of Fundamental Astronomy Board,
 *    the International Astronomical Union nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 *  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 *  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
 *  FOR A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE
 *  COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 *  INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 *  BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 *  CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 *  LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 *  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 *  POSSIBILITY OF SUCH DAMAGE. */
public final class Nutation1980 {
    private static final double[][] ARGUMENTS = {
        {485866.733, 715922.633, 31.31, 0.064, 1325},
        {1287099.804, 1292581.224, -0.577, -0.012, 99},
        {335778.877, 295263.137, -13.257, 0.011, 1342},
        {1072261.307, 1105601.328, -6.891, 0.019, 1236},
        {450160.28, -482890.539, 7.455, 0.008, -5}
    };
    private static final double[][] TERMS = {
        {0, 0, 0, 0, 1, -171996, -174.2},
        {0, 0, 0, 0, 2, 2062, 0.2},
        {-2, 0, 2, 0, 1, 46, 0},
        {2, 0, -2, 0, 0, 11, 0},
        {-2, 0, 2, 0, 2, -3, 0},
        {1, -1, 0, -1, 0, -3, 0},
        {0, -2, 2, -2, 1, -2, 0},
        {2, 0, -2, 0, 1, 1, 0},
        {0, 0, 2, -2, 2, -13187, -1.6},
        {0, 1, 0, 0, 0, 1426, -3.4},
        {0, 1, 2, -2, 2, -517, 1.2},
        {0, -1, 2, -2, 2, 217, -0.5},
        {0, 0, 2, -2, 1, 129, 0.1},
        {2, 0, 0, -2, 0, 48, 0},
        {0, 0, 2, -2, 0, -22, 0},
        {0, 2, 0, 0, 0, 17, -0.1},
        {0, 1, 0, 0, 1, -15, 0},
        {0, 2, 2, -2, 2, -16, 0.1},
        {0, -1, 0, 0, 1, -12, 0},
        {-2, 0, 0, 2, 1, -6, 0},
        {0, -1, 2, -2, 1, -5, 0},
        {2, 0, 0, -2, 1, 4, 0},
        {0, 1, 2, -2, 1, 4, 0},
        {1, 0, 0, -1, 0, -4, 0},
        {2, 1, 0, -2, 0, 1, 0},
        {0, 0, -2, 2, 1, 1, 0},
        {0, 1, -2, 2, 0, -1, 0},
        {0, 1, 0, 0, 2, 1, 0},
        {-1, 0, 0, 1, 1, 1, 0},
        {0, 1, 2, -2, 0, -1, 0},
        {0, 0, 2, 0, 2, -2274, -0.2},
        {1, 0, 0, 0, 0, 712, 0.1},
        {0, 0, 2, 0, 1, -386, -0.4},
        {1, 0, 2, 0, 2, -301, 0},
        {1, 0, 0, -2, 0, -158, 0},
        {-1, 0, 2, 0, 2, 123, 0},
        {0, 0, 0, 2, 0, 63, 0},
        {1, 0, 0, 0, 1, 63, 0.1},
        {-1, 0, 0, 0, 1, -58, -0.1},
        {-1, 0, 2, 2, 2, -59, 0},
        {1, 0, 2, 0, 1, -51, 0},
        {0, 0, 2, 2, 2, -38, 0},
        {2, 0, 0, 0, 0, 29, 0},
        {1, 0, 2, -2, 2, 29, 0},
        {2, 0, 2, 0, 2, -31, 0},
        {0, 0, 2, 0, 0, 26, 0},
        {-1, 0, 2, 0, 1, 21, 0},
        {-1, 0, 0, 2, 1, 16, 0},
        {1, 0, 0, -2, 1, -13, 0},
        {-1, 0, 2, 2, 1, -10, 0},
        {1, 1, 0, -2, 0, -7, 0},
        {0, 1, 2, 0, 2, 7, 0},
        {0, -1, 2, 0, 2, -7, 0},
        {1, 0, 2, 2, 2, -8, 0},
        {1, 0, 0, 2, 0, 6, 0},
        {2, 0, 2, -2, 2, 6, 0},
        {0, 0, 0, 2, 1, -6, 0},
        {0, 0, 2, 2, 1, -7, 0},
        {1, 0, 2, -2, 1, 6, 0},
        {0, 0, 0, -2, 1, -5, 0},
        {1, -1, 0, 0, 0, 5, 0},
        {2, 0, 2, 0, 1, -5, 0},
        {0, 1, 0, -2, 0, -4, 0},
        {1, 0, -2, 0, 0, 4, 0},
        {0, 0, 0, 1, 0, -4, 0},
        {1, 1, 0, 0, 0, -3, 0},
        {1, 0, 2, 0, 0, 3, 0},
        {1, -1, 2, 0, 2, -3, 0},
        {-1, -1, 2, 2, 2, -3, 0},
        {-2, 0, 0, 0, 1, -2, 0},
        {3, 0, 2, 0, 2, -3, 0},
        {0, -1, 2, 2, 2, -3, 0},
        {1, 1, 2, 0, 2, 2, 0},
        {-1, 0, 2, -2, 1, -2, 0},
        {2, 0, 0, 0, 1, 2, 0},
        {1, 0, 0, 0, 2, -2, 0},
        {3, 0, 0, 0, 0, 2, 0},
        {0, 0, 2, 1, 2, 2, 0},
        {-1, 0, 0, 0, 2, 1, 0},
        {1, 0, 0, -4, 0, -1, 0},
        {-2, 0, 2, 2, 2, 1, 0},
        {-1, 0, 2, 4, 2, -2, 0},
        {2, 0, 0, -4, 0, -1, 0},
        {1, 1, 2, -2, 2, 1, 0},
        {1, 0, 2, 2, 1, -1, 0},
        {-2, 0, 2, 4, 2, -1, 0},
        {-1, 0, 4, 0, 2, 1, 0},
        {1, -1, 0, -2, 0, 1, 0},
        {2, 0, 2, -2, 1, 1, 0},
        {2, 0, 2, 2, 2, -1, 0},
        {1, 0, 0, 2, 1, -1, 0},
        {0, 0, 4, -2, 2, 1, 0},
        {3, 0, 2, -2, 2, 1, 0},
        {1, 0, 2, -2, 0, -1, 0},
        {0, 1, 2, 0, 1, 1, 0},
        {-1, -1, 0, 2, 1, 1, 0},
        {0, 0, -2, 0, 1, -1, 0},
        {0, 0, 2, -1, 2, -1, 0},
        {0, 1, 0, 2, 0, -1, 0},
        {1, 0, -2, -2, 0, -1, 0},
        {0, -1, 2, 0, 1, -1, 0},
        {1, 1, 0, -2, 1, -1, 0},
        {1, 0, -2, 2, 0, -1, 0},
        {2, 0, 0, 2, 0, 1, 0},
        {0, 0, 2, 4, 2, -1, 0},
        {0, 1, 0, 1, 0, 1, 0}
    };
    private Nutation1980() { }

    public static double longitudeDegrees(double julianEphemerisDay) {
        double t = (julianEphemerisDay - 2_451_545.0) / 36_525.0;
        double[] arguments = new double[5];
        for (int i = 0; i < arguments.length; i++) {
            double[] c = ARGUMENTS[i];
            double angle = (c[0] + (c[1] + (c[2] + c[3] * t) * t) * t) * Math.PI / (180 * 3600)
                    + (c[4] * t % 1) * (2 * Math.PI);
            angle %= 2 * Math.PI;
            if (Math.abs(angle) >= Math.PI) angle -= Math.copySign(2 * Math.PI, angle);
            arguments[i] = angle;
        }
        double sum = 0;
        for (int i = TERMS.length - 1; i >= 0; i--) {
            double[] term = TERMS[i];
            double argument = 0;
            for (int j = 0; j < arguments.length; j++) argument += term[j] * arguments[j];
            sum += (term[5] + term[6] * t) * Math.sin(argument);
        }
        return sum / 10_000 / 3_600;
    }
}
