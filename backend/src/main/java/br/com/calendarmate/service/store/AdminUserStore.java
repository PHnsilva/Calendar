package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminUser;

import java.util.List;

public interface AdminUserStore {
    AdminUser findActiveByPhone(String phoneDigits);

    AdminUser findActiveById(String id);

    List<AdminUser> listActive();

    void updateLastLogin(String id, long epochSec);
}
