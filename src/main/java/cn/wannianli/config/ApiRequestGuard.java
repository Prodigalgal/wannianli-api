package cn.wannianli.config;

import java.util.concurrent.Semaphore;
import java.util.function.LongSupplier;

public final class ApiRequestGuard {

    public enum Decision { ALLOWED, RATE_LIMITED, BUSY }

    private final int burst;
    private final double tokensPerNanosecond;
    private final Semaphore concurrent;
    private final LongSupplier nanoTime;
    private double tokens;
    private long lastRefill;

    public ApiRequestGuard(int requestsPerMinute, int burst, int maxConcurrent) {
        this(requestsPerMinute, burst, maxConcurrent, System::nanoTime);
    }

    ApiRequestGuard(int requestsPerMinute, int burst, int maxConcurrent, LongSupplier nanoTime) {
        if (requestsPerMinute < 1 || burst < 1 || maxConcurrent < 1) {
            throw new IllegalArgumentException("API resource limits must be positive");
        }
        this.burst = burst;
        this.tokens = burst;
        this.tokensPerNanosecond = requestsPerMinute / 60_000_000_000.0;
        this.concurrent = new Semaphore(maxConcurrent);
        this.nanoTime = nanoTime;
        this.lastRefill = nanoTime.getAsLong();
    }

    public synchronized Decision acquire() {
        long now = nanoTime.getAsLong();
        tokens = Math.min(burst, tokens + Math.max(0, now - lastRefill) * tokensPerNanosecond);
        lastRefill = now;
        if (tokens < 1) {
            return Decision.RATE_LIMITED;
        }
        if (!concurrent.tryAcquire()) {
            return Decision.BUSY;
        }
        tokens--;
        return Decision.ALLOWED;
    }

    public void release() {
        concurrent.release();
    }

    /** The filter already reserves one unit and one concurrency permit per request. */
    public synchronized Decision chargeAdditional(int units) {
        if (units < 0) throw new IllegalArgumentException("Invalid calculation cost");
        long now = nanoTime.getAsLong();
        tokens = Math.min(burst, tokens + Math.max(0, now - lastRefill) * tokensPerNanosecond);
        lastRefill = now;
        if (tokens < units) return Decision.RATE_LIMITED;
        tokens -= units;
        return Decision.ALLOWED;
    }
}
