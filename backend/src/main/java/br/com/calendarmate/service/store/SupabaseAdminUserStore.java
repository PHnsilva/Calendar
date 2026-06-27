package br.com.calendarmate.service.store;

import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SupabaseAdminUserStore implements AdminUserStore {
    private static final Logger log = LoggerFactory.getLogger(SupabaseAdminUserStore.class);

    private final SupabaseClient sb;
    private final String table;
    private final List<AdminUser> seedUsers;
    private volatile boolean seedAttempted;

    public SupabaseAdminUserStore(SupabaseClient sb, String table, String seedConfig) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "admin_users" : table.trim();
        this.seedUsers = AdminUserSeedParser.parse(seedConfig);
    }

    @Override
    public AdminUser findActiveByPhone(String phoneDigits) {
        String normalized = PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(phoneDigits);
        if (normalized.isBlank()) {
            return null;
        }

        List<Map> rows = sb.select(table, Map.of("phone_digits", normalized, "active", "true"), 1, null);
        AdminUser exact = first(rows);
        if (exact != null) {
            return exact;
        }

        AdminUser seeded = seedUsers.stream()
                .filter(user -> normalized.equals(user.getPhoneDigits()))
                .findFirst()
                .orElse(null);
        if (seeded != null) {
            upsertSeed(seeded);
            rows = sb.select(table, Map.of("phone_digits", normalized, "active", "true"), 1, null);
            exact = first(rows);
            if (exact != null) {
                return exact;
            }
        }

        return listActive().stream()
                .filter(user -> normalized.equals(PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(user.getPhoneDigits())))
                .findFirst()
                .orElse(null);
    }

    @Override
    public AdminUser findActiveById(String id) {
        ensureSeedUsersAvailable();
        List<Map> rows = sb.select(table, Map.of("id", id == null ? "" : id.trim(), "active", "true"), 1, null);
        return first(rows);
    }

    @Override
    public List<AdminUser> listActive() {
        ensureSeedUsersAvailable();
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

    private void ensureSeedUsersAvailable() {
        if (seedAttempted || seedUsers.isEmpty()) {
            return;
        }
        synchronized (this) {
            if (seedAttempted) {
                return;
            }
            for (AdminUser user : seedUsers) {
                upsertSeed(user);
            }
            seedAttempted = true;
        }
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
        user.setPhoneDigits(PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(str(row.get("phone_digits"))));
        user.setName(str(row.get("name")));
        user.setRole(AdminRole.from(str(row.get("role"))));
        user.setActive(bool(row.get("active")));
        user.setCreatedAtEpochSec(longv(row.get("created_at")));
        user.setLastLoginAtEpochSec(longv(row.get("last_login_at")));
        return user;
    }

    private void upsertSeed(AdminUser user) {
        try {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", user.getId());
            row.put("phone_digits", user.getPhoneDigits());
            row.put("name", user.getName());
            row.put("role", user.getRole() == null ? "PROVIDER" : user.getRole().name());
            row.put("active", user.isActive());
            sb.upsert(table, List.of(row), "id");
        } catch (Exception ex) {
            log.warn("Could not seed configured admin user phone={}", maskPhone(user.getPhoneDigits()), ex);
        }
    }

    private static String maskPhone(String phoneDigits) {
        String digits = PhoneNumberNormalizer.digitsOnly(phoneDigits);
        if (digits.length() == 10 || digits.length() == 11) {
            digits = "55" + digits;
        }
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return "+" + digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
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
