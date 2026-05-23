package br.com.calendarmate.service.store;

import br.com.calendarmate.model.AdminSession;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryAdminSessionStore implements AdminSessionStore {
    private final Map<String, AdminSession> byHash = new ConcurrentHashMap<>();

    @Override
    public void save(AdminSession session) {
        if (session != null && session.getTokenHash() != null) {
            byHash.put(session.getTokenHash(), session);
        }
    }

    @Override
    public AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec) {
        AdminSession session = byHash.get(tokenHash);
        return session != null && session.isActive(nowEpochSec) ? session : null;
    }

    @Override
    public void touch(String sessionId, long nowEpochSec) {
        byHash.values().forEach(session -> {
            if (sessionId != null && sessionId.equals(session.getSessionId())) {
                session.setLastSeenAtEpochSec(nowEpochSec);
            }
        });
    }

    @Override
    public void revokeByTokenHash(String tokenHash, long nowEpochSec) {
        AdminSession session = byHash.get(tokenHash);
        if (session != null) {
            session.setRevokedAtEpochSec(nowEpochSec);
        }
    }

    @Override
    public int deleteExpired(long nowEpochSec) {
        int before = byHash.size();
        byHash.entrySet().removeIf(entry -> !entry.getValue().isActive(nowEpochSec));
        return before - byHash.size();
    }
}
