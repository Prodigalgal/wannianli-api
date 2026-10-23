package cn.wannianli.support;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import java.util.Map;
import cn.wannianli.api.AlmanacResponse;
import cn.wannianli.rules.ActivityResult.Disposition;
import cn.wannianli.rules.ClassicalRules;
import tools.jackson.databind.json.JsonMapper;

/** Independent source fixture controls the public omission expectations in older taboo regressions. */
public final class SourceCalendarAssertions {
    private static final Map<String,Object> FIXTURE = load();
    private SourceCalendarAssertions() { }
    @SuppressWarnings("unchecked")
    private static Map<String,Object> load() {
        try(var input=SourceCalendarAssertions.class.getResourceAsStream("/fixtures/calendar-days.json")) {
            return JsonMapper.builder().build().readValue(input,Map.class);
        } catch(java.io.IOException error) { throw new ExceptionInInitializerError(error); }
    }
    public static void assertRetainedUnlessUnprinted(AlmanacResponse value,String activity) {
        var names=value.traditionalAlmanac().gods().inauspicious();
        boolean omitted=names.contains("月忌日")&&!ClassicalRules.strings(FIXTURE,"monthlyAllowed").contains(activity)
                ||names.stream().anyMatch(List.of("春分","夏至","秋分","冬至")::contains)
                    &&ClassicalRules.strings(FIXTURE,"termOmissions").contains(activity)
                ||names.contains("冬至")&&activity.equals("伐木");
        var decision=value.activities().decisions().stream().filter(d->d.activity().equals(activity)).findFirst().orElseThrow();
        assertThat(decision.avoidedBy()).isNotEmpty();
        if(omitted) {
            assertThat(decision.disposition()).as("%s %s",value.gregorian().date(),activity).isEqualTo(Disposition.OMITTED);
            assertThat(decision.rationale()).contains("月忌日止注或分至日不注");
            assertThat(value.activities().recommended()).doesNotContain(activity);
            assertThat(value.activities().avoided()).doesNotContain(activity);
            assertThat(value.activities().caution()).doesNotContain(activity);
        } else assertThat(value.activities().avoided()).as("%s %s",value.gregorian().date(),activity).contains(activity);
    }
}
