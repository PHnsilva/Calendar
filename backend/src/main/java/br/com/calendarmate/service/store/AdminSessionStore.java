package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminSession;

public interface AdminSessionStore {
    void save(AdminSession session);

    AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec);

    void touch(String sessionId, long nowEpochSec);

    void revokeByTokenHash(String tokenHash, long nowEpochSec);

    int deleteExpired(long nowEpochSec);
}
