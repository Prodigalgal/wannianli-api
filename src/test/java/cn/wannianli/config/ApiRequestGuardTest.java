package cn.wannianli.config;

import static org.assertj.core.api.Assertions.assertThat;
import static cn.wannianli.config.ApiRequestGuard.Decision.*;

import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class ApiRequestGuardTest {

    @Test
    void capsConcurrentWorkAndReleasesPermits() {
        var time = new AtomicLong();
        var guard = new ApiRequestGuard(120, 20, 1, time::get);
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        assertThat(guard.acquire()).isEqualTo(BUSY);
        guard.release();
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        guard.release();
    }

    @Test
    void boundsBurstsAndRefillsUsingMonotonicTime() {
        var time = new AtomicLong();
        var guard = new ApiRequestGuard(60, 1, 4, time::get);
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        guard.release();
        assertThat(guard.acquire()).isEqualTo(RATE_LIMITED);
        time.set(999_999_999);
        assertThat(guard.acquire()).isEqualTo(RATE_LIMITED);
        time.set(1_000_000_000);
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        guard.release();
    }

    @Test
    void additionalDaysConsumeSharedTokensWithoutTakingAnotherPermit() {
        var time = new AtomicLong(); var guard = new ApiRequestGuard(120, 20, 1, time::get);
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        assertThat(guard.chargeAdditional(13)).isEqualTo(ALLOWED);
        guard.release();
        assertThat(guard.acquire()).isEqualTo(ALLOWED);
        assertThat(guard.chargeAdditional(6)).isEqualTo(RATE_LIMITED);
        guard.release();
        assertThat(guard.acquire()).isEqualTo(ALLOWED); guard.release();
    }
}
