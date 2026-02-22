package com.example.Calendar.service;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryVerificationStore {

    public static class Session {
        public final String verificationId;
        public final String eventId;
        public final String phoneDigits;
        public final String code;
        public final long expiresAtEpochSec;
        public final long resendAllowedAtEpochSec;

        public Session(String verificationId, String eventId, String phoneDigits, String code, long exp, long resendAt) {
            this.verificationId = verificationId;
            this.eventId = eventId;
            this.phoneDigits = phoneDigits;
            this.code = code;
            this.expiresAtEpochSec = exp;
            this.resendAllowedAtEpochSec = resendAt;
        }

        public boolean isExpired() {
            return Instant.now().getEpochSecond() > expiresAtEpochSec;
        }

        public boolean canResend() {
            return Instant.now().getEpochSecond() >= resendAllowedAtEpochSec;
        }
    }

    private final ConcurrentHashMap<String, Session> sessions = new ConcurrentHashMap<>();

    public Session create(String eventId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
        long now = Instant.now().getEpochSecond();
        String verificationId = "vfy_" + UUID.randomUUID();
        String code = random6();
        Session s = new Session(
                verificationId,
                eventId,
                phoneDigits,
                code,
                now + otpTtlSeconds,
                now + resendAfterSeconds
        );
        sessions.put(verificationId, s);
        return s;
    }

    public Session get(String verificationId) {
        return sessions.get(verificationId);
    }

    public void delete(String verificationId) {
        sessions.remove(verificationId);
    }

    private static String random6() {
        int n = (int)(Math.random() * 900000) + 100000;
        return String.valueOf(n);
    }
}