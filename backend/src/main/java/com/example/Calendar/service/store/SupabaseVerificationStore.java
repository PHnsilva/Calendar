package com.example.Calendar.service.store;

import com.example.Calendar.integrations.supabase.SupabaseClient;

import java.time.Instant;
import java.util.*;

public class SupabaseVerificationStore implements VerificationStore {

    private final SupabaseClient sb;
    private final String table;

    public SupabaseVerificationStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "verification_sessions" : table.trim();
    }

    @Override
    public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
        long now = Instant.now().getEpochSecond();
        String verificationId = "vfy_" + UUID.randomUUID();
        String code = random3();

        long exp = now + otpTtlSeconds;
        long resendAt = now + resendAfterSeconds;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("verification_id", verificationId);
        row.put("scope_id", scopeId);
        row.put("phone_digits", phoneDigits);
        row.put("code", code);
        row.put("expires_at", exp);
        row.put("resend_allowed_at", resendAt);

        sb.insert(table, row);

        return new Session(verificationId, scopeId, phoneDigits, code, exp, resendAt);
    }

    @Override
    public Session get(String verificationId) {
        List<Map> rows = sb.select(
                table,
                Map.of("verification_id", verificationId),
                1,
                null);
        if (rows == null || rows.isEmpty())
            return null;

        Map r = rows.get(0);

        return new Session(
                str(r.get("verification_id")),
                str(r.get("scope_id")),
                str(r.get("phone_digits")),
                str(r.get("code")),
                longv(r.get("expires_at")),
                longv(r.get("resend_allowed_at")));
    }

    @Override
    public void delete(String verificationId) {
        sb.delete(table, Map.of("verification_id", verificationId));
    }

    @Override
    public void cleanupExpired() {
        long now = Instant.now().getEpochSecond();
        sb.deleteLt(table, "expires_at", now);
    }

    private static String random3() {
        int n = (int) (Math.random() * 1000);
        return String.format("%03d", n);
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    @Override
    public Session refreshResend(String verificationId, long resendAfterSeconds) {
        Session current = get(verificationId);
        if (current == null)
            return null;

        long now = Instant.now().getEpochSecond();
        long resendAt = now + resendAfterSeconds;

        sb.update(table,
                Map.of("verification_id", verificationId),
                Map.of("resend_allowed_at", resendAt));

        return current.withResendAllowedAt(resendAt);
    }

    private static long longv(Object o) {
        if (o == null)
            return 0L;
        try {
            return Long.parseLong(String.valueOf(o));
        } catch (Exception e) {
            return 0L;
        }
    }
}