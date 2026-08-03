package cn.wannianli.config;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class TimeConfiguration {

    public static final ZoneId UTC_PLUS_8 = ZoneOffset.ofHours(8);

    @Bean
    Clock almanacClock() {
        return Clock.system(UTC_PLUS_8);
    }
}
