package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminUser;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryAdminUserStore implements AdminUserStore {
    private final Map<String, AdminUser> byId = new ConcurrentHashMap<>();
    private final Map<String, String> idByPhone = new ConcurrentHashMap<>();

    public InMemoryAdminUserStore(String config) {
        load(config);
    }

    @Override
    public AdminUser findActiveByPhone(String phoneDigits) {
        String id = idByPhone.get(normalizePhone(phoneDigits));
        AdminUser user = id == null ? null : byId.get(id);
        return user != null && user.isActive() ? user : null;
    }

    @Override
    public AdminUser findActiveById(String id) {
        AdminUser user = byId.get(id == null ? "" : id.trim());
        return user != null && user.isActive() ? user : null;
    }

    @Override
    public List<AdminUser> listActive() {
        return byId.values().stream()
                .filter(AdminUser::isActive)
                .sorted(Comparator.comparing(AdminUser::getName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    public void updateLastLogin(String id, long epochSec) {
        AdminUser user = byId.get(id);
        if (user != null) {
            user.setLastLoginAtEpochSec(epochSec);
        }
    }

    private void load(String config) {
        String raw = config == null ? "" : config.trim();
        if (raw.isBlank()) {
            return;
        }
        long now = Instant.now().getEpochSecond();
        for (String entry : raw.split(";")) {
            String item = entry == null ? "" : entry.trim();
            if (item.isBlank()) {
                continue;
            }
            String[] parts = item.split("\\|");
            String phone = parts.length > 0 ? normalizePhone(parts[0]) : "";
            if (phone.isBlank()) {
                continue;
            }
            String name = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : "Prestador";
            AdminRole role = parts.length > 2 ? AdminRole.from(parts[2]) : AdminRole.PROVIDER;
            String id = "adm_" + UUID.nameUUIDFromBytes((phone + ":" + name.toLowerCase(Locale.ROOT)).getBytes());
            AdminUser user = new AdminUser(id, phone, name, role, true, now, 0L);
            byId.put(id, user);
            idByPhone.put(phone, id);
        }
    }

    private static String normalizePhone(String value) {
        String digits = value == null ? "" : value.replaceAll("\\D", "");
        if ((digits.length() == 12 || digits.length() == 13) && digits.startsWith("55")) {
            digits = digits.substring(2);
        }
        return digits;
    }
}
