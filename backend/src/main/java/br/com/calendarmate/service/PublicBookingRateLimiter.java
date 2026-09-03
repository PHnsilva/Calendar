package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.RateLimitExceededException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class PublicBookingRateLimiter {
    private final AppProperties props;
    private final Clock clock;
    private final LinkedHashMap<String, WindowCounter> counters = new LinkedHashMap<>(32, 0.75f, true);

    @Autowired
    public PublicBookingRateLimiter(AppProperties props) {
        this(props, Clock.systemUTC());
    }

    PublicBookingRateLimiter(AppProperties props, Clock clock) {
        this.props = props;
        this.clock = clock;
    }

    public void checkLookup(String clientIp, String phoneDigits) {
        check("lookup:ip:" + safe(clientIp), props.getPublicLookupRateLimitPerIp(), props.getPublicLookupRateLimitWindowSeconds());
        check("lookup:phone:" + phoneDigits, props.getPublicLookupRateLimitPerPhone(), props.getPublicLookupRateLimitWindowSeconds());
    }

    public void checkCancellation(String clientIp, String phoneDigits) {
        check("cancel:ip:" + safe(clientIp), props.getPublicCancellationRateLimitPerIp(), props.getPublicCancellationRateLimitWindowSeconds());
        check("cancel:phone:" + phoneDigits, props.getPublicCancellationRateLimitPerPhone(), props.getPublicCancellationRateLimitWindowSeconds());
    }

    synchronized int size() {
        return counters.size();
    }

    private synchronized void check(String key, int limit, long windowSeconds) {
        long now = clock.instant().getEpochSecond();
        evictExpiredAndOverflow(now);

        WindowCounter counter = counters.get(key);
        if (counter == null || now >= counter.expiresAtEpochSec) {
            counters.put(key, new WindowCounter(1, now + windowSeconds));
            evictOverflow();
            return;
        }
        if (counter.count >= limit) {
            throw new RateLimitExceededException(counter.expiresAtEpochSec - now);
        }
        counter.count++;
    }

    private void evictExpiredAndOverflow(long now) {
        counters.entrySet().removeIf(entry -> now >= entry.getValue().expiresAtEpochSec);
        evictOverflow();
    }

    private void evictOverflow() {
        int maxSize = props.getPublicRateLimitMaxEntries();
        Iterator<Map.Entry<String, WindowCounter>> iterator = counters.entrySet().iterator();
        while (counters.size() > maxSize && iterator.hasNext()) {
            iterator.next();
            iterator.remove();
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value.trim();
    }

    private static final class WindowCounter {
        private int count;
        private final long expiresAtEpochSec;

        private WindowCounter(int count, long expiresAtEpochSec) {
            this.count = count;
            this.expiresAtEpochSec = expiresAtEpochSec;
        }
    }
}
