package br.com.calendarmate.service.store;

import br.com.calendarmate.dto.ServicoResponse;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class InMemoryBookingHistoryStore implements BookingHistoryStore {
    private final Map<String, ServicoResponse> byEventId = new ConcurrentHashMap<>();

    @Override
    public void upsert(ServicoResponse booking, long archivedAtEpochSec) {
        if (booking != null && booking.getEventId() != null) {
            byEventId.put(booking.getEventId(), booking);
        }
    }

    @Override
    public List<ServicoResponse> list(Instant fromInclusive, Instant toExclusive, String assignedProviderId) {
        return byEventId.values().stream()
                .filter(item -> item.getStart() != null)
                .filter(item -> BookingHistoryStore.isInPeriod(item, fromInclusive, toExclusive))
                .filter(item -> assignedProviderId == null || assignedProviderId.isBlank() || assignedProviderId.equals(item.getAssignedProviderId()))
                .sorted(Comparator.comparing(ServicoResponse::getStart).reversed())
                .toList();
    }

    @Override
    public List<ServicoResponse> listByPhone(String phoneDigits, int limit) {
        return byEventId.values().stream()
                .filter(item -> phoneDigits.equals(item.getClientPhone()))
                .sorted(Comparator.comparing(ServicoResponse::getStart, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(Math.max(1, limit))
                .toList();
    }

    @Override
    public int deleteOlderThan(Instant olderThan) {
        int before = byEventId.size();
        byEventId.entrySet().removeIf(entry -> entry.getValue().getStart() != null && entry.getValue().getStart().isBefore(olderThan));
        return before - byEventId.size();
    }
}
