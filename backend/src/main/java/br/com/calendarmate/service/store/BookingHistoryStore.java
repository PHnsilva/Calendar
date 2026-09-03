package br.com.calendarmate.service.store;

import br.com.calendarmate.dto.ServicoResponse;

import java.time.Instant;
import java.util.List;

public interface BookingHistoryStore {
    void upsert(ServicoResponse booking, long archivedAtEpochSec);

    List<ServicoResponse> list(Instant fromInclusive, Instant toExclusive, String assignedProviderId);

    List<ServicoResponse> listByPhone(String phoneDigits, int limit);

    int deleteOlderThan(Instant olderThan);
}
