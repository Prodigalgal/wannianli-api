package cn.wannianli.service;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import cn.wannianli.rules.ClassicalRules;
import cn.wannianli.calendar.SexagenaryCycle;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class SourceGradeTableTest {
    private SexagenaryCycle.Cycle cycle(String name) {
        return java.util.stream.IntStream.range(0, 60).mapToObj(SexagenaryCycle::fromIndex)
                .filter(value -> value.name().equals(name)).findFirst().orElseThrow();
    }
    private JsonNode table() throws Exception {
        try (var input = getClass().getResourceAsStream("/fixtures/volume10-grade-table.json")) {
            return JsonMapper.builder().build().readTree(input);
        }
    }

    @Test
    void originalTableContainsElevenColumnsAndEveryMonthExactlyOncePerColumn() throws Exception {
        var source = table();
        assertThat(source.path("columns").size()).isEqualTo(11);
        assertThat(source.path("grades").size()).isEqualTo(6);
        for (var column : source.path("columns")) {
            var months = new ArrayList<Integer>();
            assertThat(column.path("monthsByGrade").size()).isEqualTo(6);
            for (var row : column.path("monthsByGrade")) for (var month : row) months.add(month.asInt());
            assertThat(months).as(column.path("name").asString())
                    .containsExactlyInAnyOrder(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
        }
    }

    @Test
    void calculatedGradesAgreeWithTheFacsimileAcrossFiveYearsExceptExplicitSourceExceptions() throws Exception {
        var source = table();
        var service = new AlmanacService(Clock.systemUTC());
        int matched = 0, exceptions = 0, unlisted = 0;
        for (var day = LocalDate.of(2020, 1, 1); day.isBefore(LocalDate.of(2025, 1, 1)); day = day.plusDays(1)) {
            var response = service.calculateAt(day.atTime(12, 0).atZone(ZoneOffset.ofHours(8)));
            var monthCycle = cycle(response.fourPillars().month().value());
            var dayCycle = cycle(response.fourPillars().day().value());
            var anchors = new HashSet<>(response.traditionalAlmanac().gods().inauspicious());
            anchors.add(response.traditionalAlmanac().dayOfficer().name() + "日");
            var grades = new HashSet<String>();
            var columns = new HashSet<String>();
            for (var column : source.path("columns")) {
                String name = column.path("name").asString();
                if (!anchors.contains(name)) continue;
                columns.add(name);
                for (int rank = 0; rank < 6; rank++) {
                    for (var month : column.path("monthsByGrade").get(rank)) {
                        if (month.asInt() == monthCycle.branchIndex())
                            grades.add(source.path("grades").get(rank).asString());
                    }
                }
            }
            if (columns.isEmpty()) { unlisted++; continue; }
            matched++;
            assertThat(grades).as(day.toString()).hasSize(1);
            if (grades.contains(response.activities().dayGrade().name())) continue;
            boolean absolute = !ClassicalRules.absolute(monthCycle, dayCycle).isEmpty()
                    || response.traditionalAlmanac().dayOfficer().name().equals("破") && anchors.contains("四废");
            boolean pressure = anchors.stream().anyMatch(Set.of("四废", "岁薄", "逐阵")::contains)
                    && columns.stream().anyMatch(Set.of("天吏", "大时")::contains);
            assertThat(absolute || pressure).as(day + ": unexplained original-table difference").isTrue();
            if (absolute) assertThat(response.activities().dayGrade().name()).isEqualTo("LOWEST");
            exceptions++;
        }
        assertThat(matched).isEqualTo(1128);
        assertThat(exceptions).isEqualTo(64);
        assertThat(unlisted).isEqualTo(699);
    }
}
