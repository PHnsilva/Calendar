package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.AdminBulkCancelItem;
import com.example.Calendar.dto.AdminBulkCancelRequest;
import com.example.Calendar.dto.AdminBulkCancelResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.google.CalendarClient;
import com.google.api.services.calendar.model.Event;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;

@Service
public class AdminBookingOpsService {

    private final CalendarClient calendar;
    private final AppProperties props;

    public AdminBookingOpsService(CalendarClient calendar, AppProperties props) {
        this.calendar = calendar;
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
        if (e.getExtendedProperties() == null) return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private String buildSuccessMessage(String reason) {
        String r = reason == null ? "" : reason.trim();
        if (r.isBlank()) return "Agendamento cancelado";
        return "Agendamento cancelado: " + r;
    }
}