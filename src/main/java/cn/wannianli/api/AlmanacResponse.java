package cn.wannianli.api;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SeasonalContext;
import cn.wannianli.rules.ActivityResult;

public record AlmanacResponse(
        ResponseMeta meta,
        ZonedDateTime currentTime,
        GregorianDate gregorian,
        LunarDate lunar,
        FourPillars fourPillars,
        String zodiac,
        SeasonalContext seasonal,
        TraditionalAlmanac traditionalAlmanac,
        ActivityResult activities,
        CalculationDisclosure calculationDisclosure,
        List<Reference> references) {

    public AlmanacResponse {
        references = List.copyOf(references);
    }

    public record ResponseMeta(String apiVersion, String requestSemantics) {
    }

    public record GregorianDate(
            LocalDate date,
            int year,
            int month,
            int day,
            String weekday,
            long julianDayNumber) {
    }

    public record LunarDate(
            int year,
            int month,
            int day,
            boolean leapMonth,
            int daysInMonth,
            String display,
            LocalDate monthStartDate,
            Instant astronomicalNewMoon) {
    }

    public record FourPillars(Pillar year, Pillar month, Pillar day, Pillar hour, String convention,
                              List<String> sourceIds) {
        public FourPillars {
            sourceIds = List.copyOf(sourceIds);
        }
    }

    public record Pillar(
            String value,
            String heavenlyStem,
            String earthlyBranch,
            String zodiac,
            String naYin) {
    }

    public record CalculationDisclosure(
            boolean javaCalendarLibraryUsed,
            String calendarMethod,
            String astronomicalMethod,
            String supportedYears,
            String timeBasis,
            Validation validation,
            List<String> knownLimitations) {
        public CalculationDisclosure {
            knownLimitations = List.copyOf(knownLimitations);
        }
    }

    public record Validation(String policy, List<String> officialFixtures, List<String> invariants) {
        public Validation {
            officialFixtures = List.copyOf(officialFixtures);
            invariants = List.copyOf(invariants);
        }
    }

    public record Reference(
            String id,
            String title,
            String type,
            String editionOrDate,
            String locator,
            String url,
            String evidenceLevel,
            String usedFor,
            String limitation) {
    }
}
