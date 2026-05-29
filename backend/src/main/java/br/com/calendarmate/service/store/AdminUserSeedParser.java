package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.util.PhoneNumberNormalizer;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

final class AdminUserSeedParser {
    private AdminUserSeedParser() {
    }

    static List<AdminUser> parse(String config) {
        String raw = config == null ? "" : config.trim();
        if (raw.isBlank()) {
            return List.of();
        }

        long now = Instant.now().getEpochSecond();
        List<AdminUser> users = new ArrayList<>();
        for (String entry : raw.split(";")) {
            String item = entry == null ? "" : entry.trim();
            if (item.isBlank()) {
                continue;
            }

            String[] parts = item.split("\\|");
            String phone = parts.length > 0 ? PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(parts[0]) : "";
            if (phone.isBlank()) {
                continue;
            }

            AdminRole role = parts.length > 2 ? AdminRole.from(parts[2]) : AdminRole.PROVIDER;
            String fallbackName = role == AdminRole.OWNER ? "Administrador" : "Prestador";
            String name = parts.length > 1 && !parts[1].isBlank() ? parts[1].trim() : fallbackName;
            String id = "adm_" + UUID.nameUUIDFromBytes((phone + ":" + name.toLowerCase(Locale.ROOT)).getBytes());

            users.add(new AdminUser(id, phone, name, role, true, now, 0L));
        }
        return users;
    }
}
