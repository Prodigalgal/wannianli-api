package cn.wannianli.calendar.astronomy;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class SolarPrecisionTest {
    @Test
    void completeNutationMatchesTheIndependentErfaReference() {
        // ERFA t_erfa_c.c, t_nut80: pinned upstream commit recorded in Nutation1980.
        assertThat(Math.toRadians(Nutation1980.longitudeDegrees(2_400_000.5 + 53_736.0)))
                .isCloseTo(-0.9643658353226563966e-5, within(1e-13));
    }

    @Test
    void solarCrossingsMatchIndependentJplSamplesIncludingThe1979MidnightBoundary() throws Exception {
        try (var input = getClass().getResourceAsStream("/fixtures/jpl-solar-crossings.json")) {
            for (var event : JsonMapper.builder().build().readTree(input).path("events")) {
                var actual = SolarEphemeris.solarTermInstant(event.path("year").asInt(),
                        SolarTerm.valueOf(event.path("term").asString()), ZoneOffset.ofHours(8));
                var reference = Instant.parse(event.path("interpolatedCrossing").asString());
                assertThat(Math.abs(Duration.between(reference, actual).toMillis()))
                        .as(event.path("year").asInt() + " " + event.path("term").asString())
                        .isLessThan((long) (1000 * event.path("maxDifferenceSeconds").asDouble()));
            }
        }
        assertThat(SolarEphemeris.solarTermInstant(1979, SolarTerm.MAJOR_COLD, ZoneOffset.ofHours(8))
                .atOffset(ZoneOffset.ofHours(8)).toLocalDate().toString()).isEqualTo("1979-01-20");
    }
}
