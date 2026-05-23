package br.com.calendarmate.service.store;

import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminUser;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SupabaseAdminUserStore implements AdminUserStore {
    private final SupabaseClient sb;
    private final String table;

    public SupabaseAdminUserStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "admin_users" : table.trim();
    }

    @Override
    public AdminUser findActiveByPhone(String phoneDigits) {
        String normalized = normalizePhone(phoneDigits);
        List<Map> rows = sb.select(table, Map.of("phone_digits", normalized, "active", "true"), 1, null);
        AdminUser exact = first(rows);
        if (exact != null) {
            return exact;
        }
        return listActive().stream()
                .filter(user -> normalized.equals(normalizePhone(user.getPhoneDigits())))
                .findFirst()
                .orElse(null);
    }

    @Override
    public AdminUser findActiveById(String id) {
        List<Map> rows = sb.select(table, Map.of("id", id == null ? "" : id.trim(), "active", "true"), 1, null);
        return first(rows);
    }

    @Override
    public List<AdminUser> listActive() {
        List<Map> rows = sb.select(table, Map.of("active", "true"), 100, "name.asc");
        if (rows == null) {
            return List.of();
        }
        List<AdminUser> out = new ArrayList<>();
        for (Map row : rows) {
            AdminUser user = map(row);
            if (user != null) {
                out.add(user);
            }
        }
        return out;
    }

    @Override
    public void updateLastLogin(String id, long epochSec) {
        if (id == null || id.isBlank()) {
            return;
        }
        sb.update(table, Map.of("id", id), Map.of("last_login_at", epochSec));
    }

    private AdminUser first(List<Map> rows) {
        if (rows == null || rows.isEmpty()) {
            return null;
        }
        return map(rows.get(0));
    }

    private AdminUser map(Map row) {
        if (row == null) {
            return null;
        }
        AdminUser user = new AdminUser();
        user.setId(str(row.get("id")));
        user.setPhoneDigits(normalizePhone(str(row.get("phone_digits"))));
        user.setName(str(row.get("name")));
        user.setRole(AdminRole.from(str(row.get("role"))));
        user.setActive(bool(row.get("active")));
        user.setCreatedAtEpochSec(longv(row.get("created_at")));
        user.setLastLoginAtEpochSec(longv(row.get("last_login_at")));
        return user;
    }

    private static String normalizePhone(String value) {
        String digits = value == null ? "" : value.replaceAll("\\D", "");
        if ((digits.length() == 12 || digits.length() == 13) && digits.startsWith("55")) {
            digits = digits.substring(2);
        }
        return digits;
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static boolean bool(Object value) {
        if (value instanceof Boolean b) {
            return b;
        }
        String raw = str(value).trim().toLowerCase();
        return raw.equals("true") || raw.equals("1") || raw.equals("yes");
    }

    private static long longv(Object value) {
        try {
            return Long.parseLong(str(value));
        } catch (Exception e) {
            return 0L;
        }
    }
}
