package br.com.calendarmate.service.store;

import br.com.calendarmate.model.HistoryRecord;

import java.util.List;

public interface HistoryStore {

    void append(HistoryRecord record);

    List<HistoryRecord> listByPhone(String phoneDigits, int limit);

    int deleteOlderThan(long olderThanEpochSec);
}