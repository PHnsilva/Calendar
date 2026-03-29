package br.com.calendarmate.service.store;

import br.com.calendarmate.model.PendingRecord;

import java.util.List;

public interface PendingStore {

    void upsert(PendingRecord record);

    PendingRecord getByEventId(String eventId);

    List<PendingRecord> listByPhone(String phoneDigits);

    void deleteByEventId(String eventId);

    int deleteExpired(long nowEpochSec);
}