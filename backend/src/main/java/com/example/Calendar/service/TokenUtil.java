package com.example.Calendar.service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;

public class TokenUtil {
    private final String secret;
    private final long ttlSeconds;

    public TokenUtil(String secret, long ttlSeconds) {
        this.secret = secret;
        this.ttlSeconds = ttlSeconds;
    }

    public String generate(String eventId, String clientEmail) {
        long exp = Instant.now().getEpochSecond() + ttlSeconds;
        String payload = eventId + ":" + clientEmail + ":" + exp;
        String sig = hmacSha256(payload, secret);
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString((payload + ":" + sig).getBytes(StandardCharsets.UTF_8));
    }

    public VerifiedToken verify(String token) {
        try {
            byte[] dec = Base64.getUrlDecoder().decode(token);
            String decoded = new String(dec, StandardCharsets.UTF_8);

            // 4 partes: eventId, email, exp, sig
            String[] parts = decoded.split(":", 4);
            if (parts.length != 4) return null;

            String eventId = parts[0];
            String clientEmail = parts[1];
            long exp = Long.parseLong(parts[2]);
            String sig = parts[3];

            String payload = eventId + ":" + clientEmail + ":" + exp;
            String expected = hmacSha256(payload, secret);

            if (!expected.equals(sig)) return null;
            if (Instant.now().getEpochSecond() > exp) return null;

            return new VerifiedToken(eventId, clientEmail, exp);
        } catch (Exception e) {
            return null;
        }
    }

    private static String hmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(result);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static class VerifiedToken {
        private final String eventId;
        private final String clientEmail;
        private final long exp;

        public VerifiedToken(String eventId, String clientEmail, long exp) {
            this.eventId = eventId;
            this.clientEmail = clientEmail;
            this.exp = exp;
        }

        public String getEventId() { return eventId; }
        public String getClientEmail() { return clientEmail; }
        public long getExp() { return exp; }
    }
}
