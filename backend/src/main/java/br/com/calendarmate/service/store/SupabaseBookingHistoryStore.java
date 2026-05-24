package br.com.calendarmate.service.store;

import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.integrations.supabase.SupabaseClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class SupabaseBookingHistoryStore implements BookingHistoryStore {
    private final SupabaseClient sb;
    private final String table;

    public SupabaseBookingHistoryStore(SupabaseClient sb, String table) {
        this.sb = sb;
        this.table = (table == null || table.isBlank()) ? "booking_history_records" : table.trim();
    }

    @Override
    public void upsert(ServicoResponse booking, long archivedAtEpochSec) {
        if (booking == null || booking.getEventId() == null || booking.getEventId().isBlank()) {
            return;
        }
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("event_id", booking.getEventId());
        row.put("event_link", booking.getEventLink());
        row.put("service_type", booking.getServiceType());
        row.put("start_epoch", booking.getStart() == null ? 0L : booking.getStart().getEpochSecond());
        row.put("end_epoch", booking.getEnd() == null ? 0L : booking.getEnd().getEpochSecond());
        row.put("client_first_name", booking.getClientFirstName());
        row.put("client_last_name", booking.getClientLastName());
        row.put("client_email", booking.getClientEmail());
        row.put("client_phone", booking.getClientPhone());
        row.put("client_cep", booking.getClientCep());
        row.put("client_street", booking.getClientStreet());
        row.put("client_neighborhood", booking.getClientNeighborhood());
        row.put("client_number", booking.getClientNumber());
        row.put("client_complement", booking.getClientComplement());
        row.put("client_city", booking.getClientCity());
        row.put("client_state", booking.getClientState());
        row.put("client_address_line", booking.getClientAddressLine());
        row.put("status", booking.getStatus());
        row.put("assigned_provider_id", booking.getAssignedProviderId());
        row.put("assigned_provider_name", booking.getAssignedProviderName());
        row.put("assigned_provider_phone", booking.getAssignedProviderPhone());
        row.put("archived_at", archivedAtEpochSec);
        sb.upsert(table, row, "event_id");
    }

    @Override
    public List<ServicoResponse> list(Instant fromInclusive, Instant toExclusive, String assignedProviderId) {
        Map<String, String> filters = assignedProviderId == null || assignedProviderId.isBlank()
                ? null
                : Map.of("assigned_provider_id", assignedProviderId);
        List<Map> rows = sb.select(table, filters, 1000, "start_epoch.desc");
        if (rows == null) {
            return List.of();
        }
        List<ServicoResponse> out = new ArrayList<>();
        long from = fromInclusive.getEpochSecond();
        long to = toExclusive.getEpochSecond();
        for (Map row : rows) {
            long start = longv(row.get("start_epoch"));
            if (start < from || start >= to) {
                continue;
            }
            out.add(map(row));
        }
        return out;
    }

    @Override
    public int deleteOlderThan(Instant olderThan) {
        return sb.deleteLt(table, "start_epoch", olderThan.getEpochSecond());
    }

    private ServicoResponse map(Map row) {
        ServicoResponse out = new ServicoResponse();
        out.setEventId(str(row.get("event_id")));
        out.setEventLink(str(row.get("event_link")));
        out.setServiceType(str(row.get("service_type")));
        out.setStart(toInstant(row.get("start_epoch")));
        out.setEnd(toInstant(row.get("end_epoch")));
        out.setClientFirstName(str(row.get("client_first_name")));
        out.setClientLastName(str(row.get("client_last_name")));
        out.setClientEmail(str(row.get("client_email")));
        out.setClientPhone(str(row.get("client_phone")));
        out.setClientCep(str(row.get("client_cep")));
        out.setClientStreet(str(row.get("client_street")));
        out.setClientNeighborhood(str(row.get("client_neighborhood")));
        out.setClientNumber(str(row.get("client_number")));
        out.setClientComplement(str(row.get("client_complement")));
        out.setClientCity(str(row.get("client_city")));
        out.setClientState(str(row.get("client_state")));
        out.setClientAddressLine(str(row.get("client_address_line")));
        out.setStatus(str(row.get("status")));
        out.setAssignedProviderId(str(row.get("assigned_provider_id")));
        out.setAssignedProviderName(str(row.get("assigned_provider_name")));
        out.setAssignedProviderPhone(str(row.get("assigned_provider_phone")));
        return out;
    }

    private static Instant toInstant(Object value) {
        long epoch = longv(value);
        return epoch <= 0 ? null : Instant.ofEpochSecond(epoch);
    }

    private static String str(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static long longv(Object value) {
        try {
            return Long.parseLong(str(value));
        } catch (Exception e) {
            return 0L;
        }
    }
}
