package com.example.Calendar.service.store;

import com.example.Calendar.integrations.supabase.SupabaseClient;
import com.example.Calendar.model.PendingRecord;

import java.util.*;

public class SupabasePendingStore implements PendingStore {

    private final SupabaseClient sb;
    private final String table;

    public SupabasePendingStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "pending_records" : table.trim();
    }

    @Override
    public void upsert(PendingRecord record) {
        if (record == null) return;

        // Implementação simples: delete + insert (sem upsert real)
        deleteByEventId(record.getEventId());

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("event_id", record.getEventId());
        row.put("phone_digits", record.getPhoneDigits());
        row.put("pending_expires_at", record.getPendingExpiresAtEpochSec());
        row.put("created_at", record.getCreatedAtEpochSec());

        sb.insert(table, row);
    }

    @Override
    public PendingRecord getByEventId(String eventId) {
        List<Map> rows = sb.select(table, Map.of("event_id", eventId), 1, null);
        if (rows == null || rows.isEmpty()) return null;
        return map(rows.get(0));
    }

    @Override
    public List<PendingRecord> listByPhone(String phoneDigits) {
        List<Map> rows = sb.select(table, Map.of("phone_digits", phoneDigits), 200, "created_at.desc");
        if (rows == null) return List.of();
        List<PendingRecord> out = new ArrayList<>();
        for (Map r : rows) out.add(map(r));
        return out;
    }

    @Override
    public void deleteByEventId(String eventId) {
        sb.delete(table, Map.of("event_id", eventId));
    }

    @Override
    public int deleteExpired(long nowEpochSec) {
        // idem: sem suporte lt no helper -> fica para cleanup interno.
        return 0;
    }

    private PendingRecord map(Map r) {
        return new PendingRecord(
                str(r.get("event_id")),
                str(r.get("phone_digits")),
                longv(r.get("pending_expires_at")),
                longv(r.get("created_at"))
        );
    }

    private static String str(Object o) { return o == null ? "" : String.valueOf(o); }
    private static long longv(Object o) {
        if (o == null) return 0L;
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return 0L; }
    }
}