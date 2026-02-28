package com.example.Calendar.service.store;

import com.example.Calendar.model.HistoryRecord;

import java.util.List;

public interface HistoryStore {

    void append(HistoryRecord record);

    List<HistoryRecord> listByPhone(String phoneDigits, int limit);

    int deleteOlderThan(long olderThanEpochSec);
}