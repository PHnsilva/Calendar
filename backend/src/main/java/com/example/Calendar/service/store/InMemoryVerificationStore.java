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
        String code = random6();

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
    public void cleanupExpired() {
        long now = Instant.now().getEpochSecond();
        sessions.entrySet().removeIf(e -> e.getValue().expiresAtEpochSec < now);
    }

    private static String random6() {
        int n = (int)(Math.random() * 900000) + 100000;
        return String.valueOf(n);
    }
}