package com.example.Calendar.service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;

public class TokenUtil {

    private final String secret;
    private final long ttlSeconds;

    public TokenUtil(String secret, long ttlSeconds) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("Secret não pode ser nulo ou vazio");
        }
        this.secret = secret;
        this.ttlSeconds = ttlSeconds;
    }

    public String generate(String eventId, String clientEmail) {

        if (eventId == null || clientEmail == null) {
            throw new IllegalArgumentException("eventId e clientEmail são obrigatórios");
        }

        long exp = Instant.now().getEpochSecond() + ttlSeconds;

        String payload = eventId + ":" + clientEmail + ":" + exp;
        String signature = hmacSha256(payload);

        String fullToken = payload + ":" + signature;

        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(fullToken.getBytes(StandardCharsets.UTF_8));
    }

    public VerifiedToken verify(String token) {

        if (token == null || token.isBlank()) {
            return null;
        }

        try {

            byte[] decodedBytes = Base64.getUrlDecoder().decode(token);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);

            // limit 4 para evitar split excessivo
            String[] parts = decoded.split(":", 4);

            if (parts.length != 4) {
                return null;
            }

            String eventId = parts[0];
            String clientEmail = parts[1];
            long exp = Long.parseLong(parts[2]);
            String receivedSignature = parts[3];

            String payload = eventId + ":" + clientEmail + ":" + exp;
            String expectedSignature = hmacSha256(payload);

            // comparação segura contra timing attack
            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    receivedSignature.getBytes(StandardCharsets.UTF_8)
            )) {
                return null;
            }

            if (Instant.now().getEpochSecond() > exp) {
                return null;
            }

            return new VerifiedToken(eventId, clientEmail, exp);

        } catch (Exception e) {
            // qualquer erro vira token inválido
            return null;
        }
    }

    private String hmacSha256(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");

            SecretKeySpec keySpec = new SecretKeySpec(
                    secret.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA256"
            );

            mac.init(keySpec);

            byte[] result = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));

            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(result);

        } catch (Exception e) {
            // aqui sim é erro estrutural do servidor
            throw new IllegalStateException("Erro interno ao gerar assinatura HMAC", e);
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

        public String getEventId() {
            return eventId;
        }

        public String getClientEmail() {
            return clientEmail;
        }

        public long getExp() {
            return exp;
        }
    }
}
