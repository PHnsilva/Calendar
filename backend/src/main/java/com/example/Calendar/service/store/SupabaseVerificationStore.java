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
        String code = random6();

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
                null
        );
        if (rows == null || rows.isEmpty()) return null;

        Map r = rows.get(0);

        return new Session(
                str(r.get("verification_id")),
                str(r.get("scope_id")),
                str(r.get("phone_digits")),
                str(r.get("code")),
                longv(r.get("expires_at")),
                longv(r.get("resend_allowed_at"))
        );
    }

    @Override
    public void delete(String verificationId) {
        sb.delete(table, Map.of("verification_id", verificationId));
    }

    @Override
    public void cleanupExpired() {
        long now = Instant.now().getEpochSecond();
        // PostgREST: delete where expires_at < now -> não tem lt nativo no helper acima.
        // Mantemos sem cleanup aqui; faz cleanup via endpoint interno quando precisar.
    }

    private static String random6() {
        int n = (int)(Math.random() * 900000) + 100000;
        return String.valueOf(n);
    }

    private static String str(Object o) { return o == null ? "" : String.valueOf(o); }
    private static long longv(Object o) {
        if (o == null) return 0L;
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return 0L; }
    }
}