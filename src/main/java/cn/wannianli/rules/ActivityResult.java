package cn.wannianli.rules;

import java.util.List;

public record ActivityResult(
        List<String> recommended,
        List<String> avoided,
        List<String> caution,
        DayGrade dayGrade,
        boolean virtuePresent,
        boolean allActivitiesAvoided,
        List<ActivityDecision> decisions,
        List<RuleHit> ruleHits,
        ConflictPolicy policy) {

    public ActivityResult {
        recommended = List.copyOf(recommended);
        avoided = List.copyOf(avoided);
        caution = List.copyOf(caution);
        decisions = List.copyOf(decisions);
        ruleHits = List.copyOf(ruleHits);
    }

    public enum DayGrade {
        SUPERIOR("上"),
        SUPERIOR_SECOND("上次"),
        MIDDLE("中"),
        MIDDLE_SECOND("中次"),
        INFERIOR("下"),
        LOWEST("最下");

        private final String classicalName;

        DayGrade(String classicalName) {
            this.classicalName = classicalName;
        }

        public String classicalName() {
            return classicalName;
        }
    }

    public enum Disposition {
        RECOMMENDED,
        AVOID,
        CAUTION
    }

    public record ActivityDecision(
            String activity,
            Disposition disposition,
            boolean conflict,
            List<String> recommendedBy,
            List<String> avoidedBy,
            List<String> excludedLowerAuthorityRules,
            String rationale) {
        public ActivityDecision {
            recommendedBy = List.copyOf(recommendedBy);
            avoidedBy = List.copyOf(avoidedBy);
            excludedLowerAuthorityRules = List.copyOf(excludedLowerAuthorityRules);
        }
    }

    public record RuleHit(
            String ruleId,
            String name,
            String category,
            String sourceId,
            String evidenceLevel,
            int favorableStrength,
            int unfavorableStrength,
            List<String> recommends,
            List<String> avoids,
            String matchedBecause,
            String note) {
        public RuleHit {
            recommends = List.copyOf(recommends);
            avoids = List.copyOf(avoids);
        }
    }

    public record ConflictPolicy(
            String name,
            String sourceId,
            String rule,
            List<String> gradeOrder,
            String supplementalRule) {
        public ConflictPolicy {
            gradeOrder = List.copyOf(gradeOrder);
        }
    }
}
