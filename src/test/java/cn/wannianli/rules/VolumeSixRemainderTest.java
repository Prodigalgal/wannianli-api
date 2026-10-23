package cn.wannianli.rules;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;
import cn.wannianli.almanac.TraditionalAlmanac;
import cn.wannianli.calendar.SexagenaryCycle;
import cn.wannianli.service.AlmanacService;
import cn.wannianli.rules.ActivityResult.Disposition;

class VolumeSixRemainderTest {
    @SuppressWarnings("unchecked")
    private static Map<String,Object> fixture() throws Exception {
        try (var input=VolumeSixRemainderTest.class.getResourceAsStream("/fixtures/volume06-remainder.json")) {
            return JsonMapper.builder().build().readValue(input,Map.class);
        }
    }

    @Test @SuppressWarnings("unchecked")
    void independent120MonthlyCellsAreCheckedOverAll720Combinations() throws Exception {
        var data=fixture();
        var starts=(Map<String,List<String>>) data.get("branchStarts");
        var earthSack=(List<List<String>>) data.get("earthSackCorrectedDays");
        for(int ordinal=0;ordinal<12;ordinal++) for(int index=0;index<60;index++) {
            var month=SexagenaryCycle.fromIndex((ordinal+2)%12);
            var day=SexagenaryCycle.fromIndex(index);
            var good=new ArrayList<String>(); var bad=new ArrayList<String>();
            ClassicalGods.addGods(good,bad,SexagenaryCycle.fromIndex(0),month,day,0);
            for(var row:starts.entrySet()) {
                assertThat(good.contains(row.getKey())||bad.contains(row.getKey()))
                    .as("month %s day %s god %s",ordinal+1,day.name(),row.getKey())
                    .isEqualTo(row.getValue().get(ordinal).equals(SexagenaryCycle.BRANCHES[day.branchIndex()]));
            }
            assertThat(bad.contains("地囊")).as("month %s day %s",ordinal+1,day.name()).isEqualTo(earthSack.get(ordinal).contains(day.name()));
        }
    }

    private static boolean earthSack(int ordinal,String dayName) {
        for(int index=0;index<60;index++) if(SexagenaryCycle.fromIndex(index).name().equals(dayName)) {
            var bad=new ArrayList<String>();
            ClassicalGods.addGods(new ArrayList<>(),bad,SexagenaryCycle.fromIndex(0),SexagenaryCycle.fromIndex((ordinal+2)%12),SexagenaryCycle.fromIndex(index),0);
            return bad.contains("地囊");
        }
        throw new IllegalArgumentException(dayName);
    }

    @Test
    void earthSackExcludesTheExplicitlyCorrectedOldQuotedErrors() {
        assertThat(earthSack(1,"乙未")).isTrue(); assertThat(earthSack(1,"癸未")).isFalse();
        assertThat(earthSack(2,"壬午")).isTrue(); assertThat(earthSack(2,"甲寅")).isFalse();
        assertThat(earthSack(3,"己酉")).isTrue(); assertThat(earthSack(3,"己丑")).isFalse();
    }

    @Test @SuppressWarnings("unchecked")
    void finalActivitiesDoNotReviveRetractedMarriageFinanceOrBeamTaboos() throws Exception {
        var lists=(Map<String,Map<String,List<String>>>) fixture().get("finalActivities");
        for(var row:lists.entrySet()) {
            var almanac=new TraditionalAlmanac(new TraditionalAlmanac.DayOfficer("平","",""),null,
                new TraditionalAlmanac.Gods(List.of(row.getKey(),"天德","天赦","天愿"),List.of(row.getKey()),false),null,null,null,null);
            var hits=ClassicalGods.hits(SexagenaryCycle.fromIndex(2),SexagenaryCycle.fromIndex(0),almanac).stream().filter(h->h.name().equals(row.getKey())).toList();
            var raw=hits.stream().filter(h->h.ruleId().startsWith("CLASSICAL_RAW_")).findFirst().orElseThrow();
            assertThat(raw.recommends()).as(row.getKey()).containsExactlyElementsOf(row.getValue().get("recommends"));
            assertThat(raw.avoids()).as(row.getKey()).containsExactlyElementsOf(row.getValue().get("avoids"));
            if(!raw.avoids().isEmpty()) assertThat(hits.stream().filter(h->h.ruleId().endsWith("_RETAINED_TABOOS")).findFirst().orElseThrow().avoids())
                .as(row.getKey()).containsExactlyElementsOf(raw.avoids());
        }
    }

    @Test @SuppressWarnings("unchecked")
    void eightRealVirtueConjunctionsKeepTheVerifiedSpecificTaboos() throws Exception {
        var data=fixture();
        var cases=(Map<String,String>) data.get("virtueRetainedCases");
        var lists=(Map<String,Map<String,List<String>>>) data.get("finalActivities");
        var service=new AlmanacService(Clock.systemUTC());
        for(var row:cases.entrySet()) {
            var value=service.calculateAt(LocalDate.parse(row.getValue()).atTime(12,0).atZone(ZoneOffset.ofHours(8)));
            assertThat(value.traditionalAlmanac().gods().inauspicious()).contains(row.getKey()).doesNotContain("无禄");
            assertThat(value.activities().virtuePresent()).isTrue();
            assertThat(value.activities().avoided()).as(row.toString()).containsAll(lists.get(row.getKey()).get("avoids"));
            assertThat(value.activities().recommended()).doesNotContainAnyElementsOf(lists.get(row.getKey()).get("avoids"));
        }
    }

    @Test
    void goingLossTransfersProclamationEvidenceWithoutTransferringItsOwnTaboo() {
        var value=new AlmanacService(Clock.systemUTC()).calculateAt(LocalDate.of(2020,1,23).atTime(12,0).atZone(ZoneOffset.ofHours(8)));
        assertThat(value.traditionalAlmanac().gods().inauspicious()).contains("往亡").doesNotContain("月厌");
        var original=value.activities().decisions().stream().filter(d->d.activity().equals("宣政事")).findFirst().orElseThrow();
        var changed=value.activities().decisions().stream().filter(d->d.activity().equals("布政事")).findFirst().orElseThrow();
        assertThat(original.recommendedBy()).isNotEmpty();
        assertThat(original.disposition()).isEqualTo(Disposition.AVOID);
        assertThat(changed.disposition()).isEqualTo(Disposition.RECOMMENDED);
        assertThat(changed.recommendedBy()).containsAll(original.recommendedBy());
        assertThat(changed.avoidedBy()).noneMatch(id->id.contains("GOING_LOSS"));
    }

    @Test
    void earthSackAndTokenSuppressPluggingHolesAndYinYangVirtueCannotResolveTaboos() {
        var service=new AlmanacService(Clock.systemUTC());
        for(var row:Map.of("2020-01-13","地囊","2020-03-15","土符").entrySet()) {
            var value=service.calculateAt(LocalDate.parse(row.getKey()).atTime(12,0).atZone(ZoneOffset.ofHours(8)));
            assertThat(value.traditionalAlmanac().gods().inauspicious()).contains(row.getValue()).doesNotContain("土府","土王用事");
            var holes=value.activities().decisions().stream().filter(d->d.activity().equals("塞穴")).findFirst().orElseThrow();
            assertThat(holes.recommendedBy()).isNotEmpty(); assertThat(holes.disposition()).isEqualTo(Disposition.OMITTED);
        }
        int found=0;
        for(var date=LocalDate.of(2024,1,1);date.isBefore(LocalDate.of(2025,1,1));date=date.plusDays(1)) {
            var result=service.calculateAt(date.atTime(12,0).atZone(ZoneOffset.ofHours(8)));
            var good=result.traditionalAlmanac().gods().auspicious();
            if(good.stream().anyMatch(List.of("阳德","阴德")::contains)&&good.stream().noneMatch(List.of("天德","月德","天德合","月德合")::contains)) {
                assertThat(result.activities().virtuePresent()).isFalse(); found++;
            }
        }
        assertThat(found).isPositive();
    }
}
