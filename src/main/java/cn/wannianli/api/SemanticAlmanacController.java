package cn.wannianli.api;

import java.io.IOException;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;
import cn.wannianli.service.AlmanacService;

@RestController
@RequestMapping("/api/v2/almanac")
public class SemanticAlmanacController {
    private final AlmanacService service;
    private final ApiContract contract;
    private final RangeCalculator ranges;

    public SemanticAlmanacController(AlmanacService service, ApiContract contract, RangeCalculator ranges) {
        this.service = service;
        this.contract = contract;
        this.ranges = ranges;
    }

    @GetMapping
    public Map<String, Object> calculateQuery(HttpServletRequest request) {
        return contract.result(service.calculate(SemanticRequest.from(SemanticRequest.query(request.getQueryString()))));
    }

    @PostMapping(consumes = "application/json")
    public Map<String, Object> calculateBody(HttpServletRequest request) throws IOException {
        return contract.result(service.calculate(SemanticRequest.from(BoundedJson.read(request.getInputStream(), 1024))));
    }

    @GetMapping("/now")
    public Map<String, Object> now() { return contract.result(service.current()); }

    @GetMapping("/range")
    public Map<String, Object> rangeQuery(HttpServletRequest request) {
        return ranges.calculate(SemanticRequest.query(request.getQueryString()), request, request.getMethod().equals("HEAD"));
    }

    @PostMapping(value = "/range", consumes = "application/json")
    public Map<String, Object> rangeBody(HttpServletRequest request) throws IOException {
        return ranges.calculate(BoundedJson.read(request.getInputStream(), 1024), request, false);
    }

    @GetMapping("/capabilities")
    public Object capabilities() { return contract.get("capabilities"); }

    @GetMapping("/openapi.json")
    public Object openApi() { return contract.openApi(); }
}
