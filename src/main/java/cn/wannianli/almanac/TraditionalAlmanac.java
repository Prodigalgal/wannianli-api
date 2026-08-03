package cn.wannianli.almanac;

import java.util.List;

public record TraditionalAlmanac(
        DayOfficer dayOfficer,
        DutyGod dutyGod,
        Gods gods,
        PengZuTaboo pengZu,
        Clash clash,
        FetalGod fetalGod,
        Mansion mansion) {

    public record DayOfficer(String name, String generalNature, String sourceId) {
    }

    public record DutyGod(String name, String path, String luck, String sourceId) {
    }

    public record Gods(List<String> auspicious, List<String> inauspicious, boolean virtuePresent) {
        public Gods {
            auspicious = List.copyOf(auspicious);
            inauspicious = List.copyOf(inauspicious);
        }
    }

    public record PengZuTaboo(String heavenlyStemRule, String earthlyBranchRule, String sourceId,
                              String evidenceLevel) {
    }

    public record Clash(String opposingPillar, String zodiac, String direction, String description) {
    }

    public record FetalGod(String position, String sourceId, String evidenceLevel) {
    }

    public record Mansion(String name, String fullName, String luck, String palace, String guardian,
                          String sourceId, String anchor, String evidenceLevel, String limitation) {
    }
}
