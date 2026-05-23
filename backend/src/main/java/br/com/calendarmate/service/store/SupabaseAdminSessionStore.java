package br.com.calendarmate.service.store;

import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.model.AdminSession;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SupabaseAdminSessionStore implements AdminSessionStore {
    private final SupabaseClient sb;
    private final String table;

    public SupabaseAdminSessionStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "admin_sessions" : table.trim();
    }

    @Override
    public void save(AdminSession session) {
        if (session == null) {
            return;
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("session_id", session.getSessionId());
        row.put("admin_user_id", session.getAdminUserId());
        row.put("token_hash", session.getTokenHash());
        row.put("created_at", session.getCreatedAtEpochSec());
        row.put("expires_at", session.getExpiresAtEpochSec());
        row.put("last_seen_at", session.getLastSeenAtEpochSec());
        row.put("revoked_at", session.getRevokedAtEpochSec());
        sb.insert(table, row);
    }

    @Override
    public AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec) {
        List<Map> rows = sb.select(table, Map.of("token_hash", tokenHash == null ? "" : tokenHash), 1, null);
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        AdminSession session = map(rows.get(0));
        return session != null && session.isActive(nowEpochSec) ? session : null;
    }

    @Override
    public void touch(String sessionId, long nowEpochSec) {
        if (sessionId == null || sessionId.isBlank()) {
            return;
        }
        sb.update(table, Map.of("session_id", sessionId), Map.of("last_seen_at", nowEpochSec));
    }

    @Override
    public void revokeByTokenHash(String tokenHash, long nowEpochSec) {
        if (tokenHash == null || tokenHash.isBlank()) {
            return;
        }
        sb.update(table, Map.of("token_hash", tokenHash), Map.of("revoked_at", nowEpochSec));
    }

    @Override
    public int deleteExpired(long nowEpochSec) {
        return sb.deleteLt(table, "expires_at", nowEpochSec);
    }

    private AdminSession map(Map row) {
        if (row == null) {
            return null;
        }
        Long revokedAt = row.get("revoked_at") == null ? null : longv(row.get("revoked_at"));
        return new AdminSession(
                str(row.get("session_id")),
                str(row.get("admin_user_id")),
                str(row.get("token_hash")),
                longv(row.get("created_at")),
                longv(row.get("expires_at")),
                longv(row.get("last_seen_at")),
                revokedAt
        );
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static long longv(Object value) {
        try {
            return Long.parseLong(str(value));
        } catch (Exception e) {
            return 0L;
        }
    }
}
