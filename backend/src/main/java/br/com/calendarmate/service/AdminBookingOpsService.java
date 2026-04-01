package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AdminBulkCancelItem;
import br.com.calendarmate.dto.AdminBulkCancelRequest;
import br.com.calendarmate.dto.AdminBulkCancelResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.service.store.PendingStore;
import com.google.api.services.calendar.model.Event;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

@Service
public class AdminBookingOpsService {

    private final PendingStore pendingStore;
    private final AppProperties props;
    private CalendarClient calendar;

    public AdminBookingOpsService(CalendarClient calendar, PendingStore pendingStore, AppProperties props) {
        this.calendar = calendar;
        this.pendingStore = pendingStore;
        this.props = props;
    }

    public AdminBulkCancelResponse bulkCancel(AdminBulkCancelRequest req) throws IOException {
        if (req == null) {
            throw new BadRequestException("Requisição inválida");
        }
        return bulkCancelByIds(req.getEventIds(), req.getReason());
    }

    public AdminBulkCancelResponse bulkCancelByIds(List<String> eventIds, String reason) throws IOException {
        if (eventIds == null || eventIds.isEmpty()) {
            throw new BadRequestException("eventIds é obrigatório");
        }

        int maxItems = props.getAdminBulkCancelMaxItems();
        if (eventIds.size() > maxItems) {
            throw new BadRequestException("Máximo de itens para cancelamento em lote: " + maxItems);
        }

        List<AdminBulkCancelItem> items = new ArrayList<>();
        int cancelled = 0;

        LinkedHashSet<String> uniqueIds = new LinkedHashSet<>();
        for (String id : eventIds) {
            if (id != null && !id.isBlank()) {
                uniqueIds.add(id.trim());
            }
        }

        for (String eventId : uniqueIds) {
            AdminBulkCancelItem item = new AdminBulkCancelItem();
            item.setEventId(eventId);

            Event e = calendar.getEvent(eventId);
            if (e == null) {
                item.setSuccess(false);
                item.setMessage("Agendamento não encontrado");
                items.add(item);
                continue;
            }

            if (!isBookingEvent(e)) {
                item.setSuccess(false);
                item.setMessage("O evento informado não é um agendamento");
                items.add(item);
                continue;
            }

            pendingStore.deleteByEventId(eventId);
            calendar.deleteEvent(eventId);

            item.setSuccess(true);
            item.setMessage(buildSuccessMessage(reason));
            items.add(item);
            cancelled++;
        }

        AdminBulkCancelResponse out = new AdminBulkCancelResponse();
        out.setTotalRequested(uniqueIds.size());
        out.setTotalCancelled(cancelled);
        out.setTotalFailed(uniqueIds.size() - cancelled);
        out.setItems(items);
        return out;
    }

    private boolean isBookingEvent(Event e) {
        Map<String, String> ext = privateExt(e);
        String entityType = ext.getOrDefault("entityType", "");
        return entityType.isBlank() || "booking".equalsIgnoreCase(entityType);
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null)
            return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null)
            return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private String buildSuccessMessage(String reason) {
        String r = reason == null ? "" : reason.trim();
        if (r.isBlank())
            return "Agendamento cancelado";
        return "Agendamento cancelado: " + r;
    }
}