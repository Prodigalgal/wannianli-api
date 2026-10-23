package cn.wannianli.api;

import java.io.IOException;
import java.util.*;
import org.springframework.stereotype.Component;
import org.springframework.aot.hint.RuntimeHints;
import org.springframework.aot.hint.RuntimeHintsRegistrar;
import org.springframework.context.annotation.ImportRuntimeHints;
import tools.jackson.databind.json.JsonMapper;

@Component
@ImportRuntimeHints(ApiContract.ResourceHints.class)
public final class ApiContract {
    private final JsonMapper json;
    private final Map<String, Object> contract;
    private final Map<String, Object> openApi;

    public ApiContract(JsonMapper json) throws IOException {
        this.json = json;
        contract = load("api/contract.json");
        openApi = load("api/openapi.json");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> load(String path) throws IOException {
        try (var input = ApiContract.class.getClassLoader().getResourceAsStream(path)) {
            if (input == null) throw new IOException("Missing API contract resource");
            return json.readValue(input, Map.class);
        }
    }

    public Object get(String key) { return contract.get(key); }
    public Map<String, Object> openApi() { return openApi; }
    public String encode(Object value) { return json.writeValueAsString(value); }

    @SuppressWarnings("unchecked")
    public Map<String, Object> result(AlmanacResponse value) {
        Map<String, Object> legacy = json.convertValue(CurrentAlmanacResponse.from(value), Map.class);
        var result = new LinkedHashMap<String, Object>();
        result.put("schemaVersion", "2.0");
        result.put("utcOffset", "+08:00");
        result.put("scope", contract.get("resultScope"));
        result.putAll((Map<String, Object>) convert(legacy, true));
        String grade = value.activities().dayGrade().name();
        var capabilities = (Map<?, ?>) contract.get("capabilities");
        if (!((Map<?, ?>) capabilities.get("dayGrades")).containsKey(grade))
            throw new IllegalStateException("Unmapped public day grade");
        ((Map<String, Object>) result.get("activities")).put("dayGradeCode", grade);
        return result;
    }

    private Object convert(Object value, boolean root) {
        if (value instanceof List<?> list) return list.stream().map(child -> convert(child, false)).toList();
        if (value instanceof Map<?, ?> map) {
            var result = new LinkedHashMap<String, Object>();
            var names = (Map<?, ?>) contract.get("fieldNames");
            var booleans = (List<?>) contract.get("booleanKeys");
            map.forEach((key, child) -> {
                String name = root && "冲煞".equals(key) ? "clash" : (String) names.get(key);
                if (name == null) throw new IllegalStateException("Unmapped public result field");
                result.put(name, booleans.contains(name) ? "是".equals(child) : convert(child, false));
            });
            return result;
        }
        return value;
    }

    public static class ResourceHints implements RuntimeHintsRegistrar {
        @Override
        public void registerHints(RuntimeHints hints, ClassLoader classLoader) {
            hints.resources().registerPattern("api/*.json");
            hints.resources().registerPattern("rules/*.json");
            hints.resources().registerPattern("META-INF/licenses/ERFA.txt");
        }
    }
}
