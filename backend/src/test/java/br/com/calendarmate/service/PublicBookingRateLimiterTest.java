package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.GlobalExceptionHandler;
import br.com.calendarmate.exception.RateLimitExceededException;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PublicBookingRateLimiterTest {
    @Test
    void limitsLookupByIpAndPhoneAndReturnsHttp429() {
        PublicBookingRateLimiter limiter = new PublicBookingRateLimiter(new TestProperties(), Clock.fixed(Instant.parse("2026-09-03T12:00:00Z"), ZoneId.of("UTC")));

        limiter.checkLookup("198.51.100.1", "31999999999");
        limiter.checkLookup("198.51.100.1", "31999999999");
        RateLimitExceededException exceeded = assertThrows(
                RateLimitExceededException.class,
                () -> limiter.checkLookup("198.51.100.1", "31999999999"));

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/servicos/public/lookup");
        var response = new GlobalExceptionHandler().rateLimitExceeded(exceeded, request);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
        assertEquals("60", response.getHeaders().getFirst("Retry-After"));
        assertEquals("RATE_LIMITED", response.getBody().getCode());
    }

    @Test
    void limitsCancellationSeparatelyAndKeepsTheCacheBounded() {
        PublicBookingRateLimiter limiter = new PublicBookingRateLimiter(new TestProperties(), Clock.fixed(Instant.parse("2026-09-03T12:00:00Z"), ZoneId.of("UTC")));

        limiter.checkCancellation("198.51.100.2", "31988888888");
        assertThrows(RateLimitExceededException.class, () -> limiter.checkCancellation("198.51.100.2", "31988888888"));

        for (int index = 0; index < 120; index++) {
            limiter.checkLookup("203.0.113." + index, "3199000" + String.format("%04d", index));
        }
        assertEquals(100, limiter.size());
    }

    @Test
    void expiredWindowsAreEvictedAndCanBeUsedAgain() {
        MutableClock clock = new MutableClock(Instant.parse("2026-09-03T12:00:00Z"));
        PublicBookingRateLimiter limiter = new PublicBookingRateLimiter(new TestProperties(), clock);
        limiter.checkLookup("198.51.100.1", "31999999999");
        limiter.checkLookup("198.51.100.1", "31999999999");
        assertThrows(RateLimitExceededException.class, () -> limiter.checkLookup("198.51.100.1", "31999999999"));

        clock.advanceSeconds(61);

        assertDoesNotThrow(() -> limiter.checkLookup("198.51.100.1", "31999999999"));
        assertEquals(2, limiter.size());
    }

    @Test
    void forwardedHeadersAreIgnoredUnlessTheImmediateProxyIsTrusted() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("203.0.113.10");
        request.addHeader("X-Forwarded-For", "192.0.2.99, 198.51.100.20, 203.0.113.10");

        assertEquals("203.0.113.10", new ClientIpResolver(new AppProperties()).resolve(request));
        assertEquals("198.51.100.20", new ClientIpResolver(new TrustedProxyProperties()).resolve(request));
    }

    private static class TestProperties extends AppProperties {
        public int getPublicRateLimitMaxEntries() { return 100; }
        public long getPublicLookupRateLimitWindowSeconds() { return 60; }
        public int getPublicLookupRateLimitPerIp() { return 2; }
        public int getPublicLookupRateLimitPerPhone() { return 2; }
        public long getPublicCancellationRateLimitWindowSeconds() { return 3_600; }
        public int getPublicCancellationRateLimitPerIp() { return 1; }
        public int getPublicCancellationRateLimitPerPhone() { return 1; }
    }

    private static final class TrustedProxyProperties extends AppProperties {
        public boolean isTrustProxyHeaders() { return true; }
        public Set<String> getTrustedProxyAddresses() { return Set.of("203.0.113.10"); }
    }

    private static final class MutableClock extends Clock {
        private Instant instant;

        private MutableClock(Instant instant) { this.instant = instant; }
        private void advanceSeconds(long seconds) { instant = instant.plusSeconds(seconds); }
        public ZoneId getZone() { return ZoneId.of("UTC"); }
        public Clock withZone(ZoneId zone) { return this; }
        public Instant instant() { return instant; }
    }
}
