package br.com.calendarmate.service.store;

import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.integrations.supabase.SupabaseClient;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SupabaseBookingHistoryStoreTest {
    @Test
    void listsEveryRequestedPhoneRecordUsingTheNormalizedPhoneFilter() {
        SupabaseClient client = mock(SupabaseClient.class);
        when(client.select("booking_history_records", Map.of("client_phone", "31999999999"), 1000, "start_epoch.desc"))
                .thenReturn(List.of(Map.of("event_id", "booking-1", "client_phone", "31999999999", "start_epoch", 100L)));
        SupabaseBookingHistoryStore store = new SupabaseBookingHistoryStore(client, "booking_history_records");

        List<ServicoResponse> result = store.listByPhone("31999999999", 1000);

        assertEquals(1, result.size());
        assertEquals("booking-1", result.get(0).getEventId());
    }

    @Test
    void cancellationStatusStillPersistsDuringACompatibleSchemaRollout() {
        SupabaseClient client = mock(SupabaseClient.class);
        ExternalServiceException missingColumns = new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "SUPABASE_REJECTED_REQUEST",
                "missing optional columns",
                "Supabase",
                400,
                null);
        doThrow(missingColumns).doNothing().when(client).upsert(eq("booking_history_records"), org.mockito.ArgumentMatchers.any(), eq("event_id"));
        SupabaseBookingHistoryStore store = new SupabaseBookingHistoryStore(client, "booking_history_records");
        ServicoResponse cancelled = new ServicoResponse();
        cancelled.setEventId("booking-1");
        cancelled.setStatus("CANCELLED");
        cancelled.setCancellationAt(Instant.parse("2026-09-03T12:00:00Z"));
        cancelled.setCancellationSource("CUSTOMER_PHONE_LOOKUP");

        store.upsert(cancelled, 1_788_436_800L);

        @SuppressWarnings("rawtypes") ArgumentCaptor<Map> rows = ArgumentCaptor.forClass(Map.class);
        verify(client, times(2)).upsert(eq("booking_history_records"), rows.capture(), eq("event_id"));
        assertEquals("CANCELLED", rows.getAllValues().get(1).get("status"));
        assertEquals(false, rows.getAllValues().get(1).containsKey("cancellation_at"));
    }
}
