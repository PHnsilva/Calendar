package com.example.Calendar.service.store;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryVerificationStore implements VerificationStore {

    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    @Override
    public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
        long now = Instant.now().getEpochSecond();
        String verificationId = "vfy_" + UUID.randomUUID();
        String code = random3();

        Session s = new Session(
                verificationId,
                scopeId,
                phoneDigits,
                code,
                now + otpTtlSeconds,
                now + resendAfterSeconds
        );

        sessions.put(verificationId, s);
        return s;
    }

    @Override
    public Session get(String verificationId) {
        return sessions.get(verificationId);
    }

    @Override
    public void delete(String verificationId) {
        sessions.remove(verificationId);
    }

    @Override
    public Session refreshResend(String verificationId, long resendAfterSeconds) {
        Session current = sessions.get(verificationId);
        if (current == null) return null;

        long now = Instant.now().getEpochSecond();
        Session updated = current.withResendAllowedAt(now + resendAfterSeconds);
        sessions.put(verificationId, updated);
        return updated;
    }

    @Override
    public void cleanupExpired() {
        long now = Instant.now().getEpochSecond();
        sessions.entrySet().removeIf(e -> e.getValue().expiresAtEpochSec < now);
    }

    private static String random3() {
        int n = (int) (Math.random() * 1000);
        return String.format("%03d", n);
    }
}