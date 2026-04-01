package br.com.calendarmate.service.store;

import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.model.HistoryRecord;

import java.util.*;

public class SupabaseHistoryStore implements HistoryStore {

    private final SupabaseClient sb;
    private final String table;

    public SupabaseHistoryStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "history_records" : table.trim();
    }

    @Override
    public void append(HistoryRecord record) {
        if (record == null)
            return;

        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", record.getId());
        row.put("type", record.getType());
        row.put("phone_digits", record.getPhoneDigits());
        row.put("event_id", record.getEventId());
        row.put("created_at", record.getCreatedAtEpochSec());
        row.put("meta", record.getMeta());

        sb.insert(table, row);
    }

    @Override
    public List<HistoryRecord> listByPhone(String phoneDigits, int limit) {
        int lim = Math.max(1, Math.min(limit, 200));
        List<Map> rows = sb.select(table, Map.of("phone_digits", phoneDigits), lim, "created_at.desc");
        if (rows == null)
            return List.of();

        List<HistoryRecord> out = new ArrayList<>();
        for (Map r : rows)
            out.add(map(r));
        return out;
    }

    @Override
    public int deleteOlderThan(long olderThanEpochSec) {
        return sb.deleteLt(table, "created_at", olderThanEpochSec);
    }

    private HistoryRecord map(Map r) {
        return new HistoryRecord(
                str(r.get("id")),
                str(r.get("type")),
                str(r.get("phone_digits")),
                str(r.get("event_id")),
                longv(r.get("created_at")),
                str(r.get("meta")));
    }

    private static String str(Object o) {
        return o == null ? "" : String.valueOf(o);
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