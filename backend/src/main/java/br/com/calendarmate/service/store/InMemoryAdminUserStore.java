package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.util.PhoneNumberNormalizer;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryAdminUserStore implements AdminUserStore {
    private final Map<String, AdminUser> byId = new ConcurrentHashMap<>();
    private final Map<String, String> idByPhone = new ConcurrentHashMap<>();

    public InMemoryAdminUserStore(String config) {
        load(config);
    }

    @Override
    public AdminUser findActiveByPhone(String phoneDigits) {
        String id = idByPhone.get(PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(phoneDigits));
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
        for (AdminUser user : AdminUserSeedParser.parse(config)) {
            byId.put(user.getId(), user);
            idByPhone.put(user.getPhoneDigits(), user.getId());
        }
    }
}
