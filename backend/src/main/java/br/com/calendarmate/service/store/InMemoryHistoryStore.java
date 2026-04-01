package br.com.calendarmate.service.store;

import br.com.calendarmate.model.HistoryRecord;

import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

public class InMemoryHistoryStore implements HistoryStore {

    private final CopyOnWriteArrayList<HistoryRecord> records = new CopyOnWriteArrayList<>();

    @Override
    public void append(HistoryRecord record) {
        if (record == null) return;
        records.add(record);
    }

    @Override
    public List<HistoryRecord> listByPhone(String phoneDigits, int limit) {
        if (phoneDigits == null) return List.of();
        int lim = Math.max(1, Math.min(limit, 200));

        return records.stream()
                .filter(r -> phoneDigits.equals(r.getPhoneDigits()))
                .sorted(Comparator.comparingLong(HistoryRecord::getCreatedAtEpochSec).reversed())
                .limit(lim)
                .collect(Collectors.toList());
    }

    @Override
    public int deleteOlderThan(long olderThanEpochSec) {
        int before = records.size();
        records.removeIf(r -> r != null && r.getCreatedAtEpochSec() < olderThanEpochSec);
        return before - records.size();
    }
}