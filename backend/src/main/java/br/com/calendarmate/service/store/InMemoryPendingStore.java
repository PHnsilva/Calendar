package br.com.calendarmate.service.store;

import br.com.calendarmate.model.PendingRecord;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

public class InMemoryPendingStore implements PendingStore {

    private final ConcurrentHashMap<String, PendingRecord> byEventId = new ConcurrentHashMap<>();

    @Override
    public void upsert(PendingRecord record) {
        if (record == null || record.getEventId() == null || record.getEventId().isBlank()) return;
        byEventId.put(record.getEventId(), record);
    }

    @Override
    public PendingRecord getByEventId(String eventId) {
        return byEventId.get(eventId);
    }

    @Override
    public List<PendingRecord> listByPhone(String phoneDigits) {
        if (phoneDigits == null) return List.of();
        return byEventId.values().stream()
                .filter(r -> phoneDigits.equals(r.getPhoneDigits()))
                .sorted(Comparator.comparingLong(PendingRecord::getCreatedAtEpochSec).reversed())
                .collect(Collectors.toList());
    }

    @Override
    public void deleteByEventId(String eventId) {
        if (eventId == null) return;
        byEventId.remove(eventId);
    }

    @Override
    public int deleteExpired(long nowEpochSec) {
        int before = byEventId.size();
        byEventId.entrySet().removeIf(e -> e.getValue() != null && e.getValue().isExpired(nowEpochSec));
        return before - byEventId.size();
    }
}