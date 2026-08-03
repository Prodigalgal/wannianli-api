package cn.wannianli.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.Test;

import cn.wannianli.rules.ActivityResult.DayGrade;

class AlmanacServiceTest {

    private static final ZoneId UTC_PLUS_8 = ZoneOffset.ofHours(8);

    @Test
    void returnsAuditableCurrentUtcPlus8AlmanacForFixedClock() {
        Clock clock = Clock.fixed(Instant.parse("2026-08-03T04:00:00Z"), UTC_PLUS_8);
        var result = new AlmanacService(clock).current();

        assertThat(result.currentTime().toString()).startsWith("2026-08-03T12:00+08:00");
        assertThat(result.lunar().display()).isEqualTo("二〇二六年六月廿一");
        assertThat(result.fourPillars().year().value()).isEqualTo("丙午");
        assertThat(result.fourPillars().month().value()).isEqualTo("乙未");
        assertThat(result.fourPillars().day().value()).isEqualTo("己酉");
        assertThat(result.fourPillars().hour().value()).isEqualTo("庚午");
        assertThat(result.zodiac()).isEqualTo("马");

        assertThat(result.seasonal().season()).isEqualTo("夏季");
        assertThat(result.seasonal().solarTerm().currentPeriod()).isEqualTo("大暑");
        assertThat(result.seasonal().solarTerm().dayInPeriod()).isEqualTo(12);
        assertThat(result.seasonal().sanFu().active()).isTrue();
        assertThat(result.seasonal().sanFu().name()).isEqualTo("中伏");

        assertThat(result.traditionalAlmanac().dayOfficer().name()).isEqualTo("满");
        assertThat(result.traditionalAlmanac().dutyGod().name()).isEqualTo("勾陈");
        assertThat(result.traditionalAlmanac().dutyGod().path()).isEqualTo("黑道");
        assertThat(result.traditionalAlmanac().gods().auspicious())
                .containsExactly("月德合", "天德合", "天恩", "四相", "民日", "天巫", "福德");
        assertThat(result.traditionalAlmanac().gods().inauspicious())
                .containsExactly("灾煞", "天火");
        assertThat(result.traditionalAlmanac().pengZu().heavenlyStemRule())
                .isEqualTo("己不破券，二主并亡");
        assertThat(result.traditionalAlmanac().pengZu().earthlyBranchRule())
                .isEqualTo("酉不会客，宾主有伤");
        assertThat(result.traditionalAlmanac().fetalGod().position()).isEqualTo("占大门外东北");
        assertThat(result.traditionalAlmanac().clash().description()).isEqualTo("冲兔（癸卯），煞东");
        assertThat(result.traditionalAlmanac().mansion().name()).isEqualTo("危");

        assertThat(result.activities().dayGrade()).isEqualTo(DayGrade.MIDDLE);
        assertThat(result.activities().recommended()).contains("开市", "交易", "纳财");
        assertThat(result.activities().recommended()).doesNotContain("宴会", "庆赐赏贺");
        assertThat(result.activities().avoided()).contains("宴会", "求医", "疗病");
        assertThat(result.activities().ruleHits())
                .anySatisfy(hit -> {
                    assertThat(hit.ruleId()).startsWith("DISASTER_SHA");
                    assertThat(hit.note()).contains("辰戌丑未月满日与德神并");
                });
        assertThat(result.calculationDisclosure().javaCalendarLibraryUsed()).isFalse();
        assertThat(result.references()).extracting(reference -> reference.id())
                .contains("GB_T_33661_2017", "XIEJI_BIANFANGSHU_VOLUME_10", "HKO_2026");
    }

    @Test
    void lateZiHourKeepsTheCivilDayPillar() {
        var beforeMidnight = new AlmanacService(
                Clock.fixed(Instant.parse("2026-08-03T15:30:00Z"), UTC_PLUS_8)).current();
        var afterMidnight = new AlmanacService(
                Clock.fixed(Instant.parse("2026-08-03T16:30:00Z"), UTC_PLUS_8)).current();

        assertThat(beforeMidnight.fourPillars().day().value()).isEqualTo("己酉");
        assertThat(afterMidnight.fourPillars().day().value()).isEqualTo("庚戌");
    }

    @Test
    void internalRuleHitsRemainTraceableAfterThePublicProjectionIsSimplified() {
        var result = new AlmanacService(
                Clock.fixed(Instant.parse("2026-08-03T04:00:00Z"), UTC_PLUS_8)).current();
        Set<String> referenceIds = result.references().stream()
                .map(reference -> reference.id())
                .collect(Collectors.toSet());

        assertThat(result.activities().ruleHits()).isNotEmpty().allSatisfy(hit -> {
            assertThat(hit.ruleId()).isNotBlank();
            assertThat(hit.matchedBecause()).isNotBlank();
            assertThat(hit.evidenceLevel()).isNotBlank();
            assertThat(hit.sourceId()).isIn(referenceIds);
        });
        assertThat(result.activities().decisions()).isNotEmpty().allSatisfy(decision -> {
            assertThat(decision.activity()).isNotBlank();
            assertThat(decision.rationale()).isNotBlank();
        });
    }
}
