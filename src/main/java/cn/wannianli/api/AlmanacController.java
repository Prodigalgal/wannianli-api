package cn.wannianli.api;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cn.wannianli.service.AlmanacService;

@RestController
@RequestMapping("/api/v1/almanac")
public class AlmanacController {

    private final AlmanacService almanacService;

    public AlmanacController(AlmanacService almanacService) {
        this.almanacService = almanacService;
    }

    @GetMapping("/current")
    public CurrentAlmanacResponse current() {
        return CurrentAlmanacResponse.from(almanacService.current());
    }
}
