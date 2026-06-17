package br.com.calendarmate.verification.application;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.PendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.google.api.services.calendar.model.Event;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Application use case for confirming client booking phone verification.
 */
@Service
public class ConfirmVerificationUseCase {
    private final CalendarClient calendarClient;
    private final VerificationStore store;
    private final PendingStore pendingStore;

    public ConfirmVerificationUseCase(
            CalendarClient calendarClient,
            @Qualifier("verificationStore") VerificationStore store,
            @Qualifier("pendingStore") PendingStore pendingStore) {
        this.calendarClient = calendarClient;
        this.store = store;
        this.pendingStore = pendingStore;
    }

    public void execute(String verificationId, String code) throws IOException {
        VerificationStore.Session sess = store.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("C\u00f3digo inv\u00e1lido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("C\u00f3digo expirou");
        }
        if (!sess.code.equals(code)) {
            throw new BadRequestException("C\u00f3digo inv\u00e1lido");
        }

        Event ev = calendarClient.getEvent(sess.scopeId);
        if (ev == null) {
            throw new NotFoundException("Agendamento n\u00e3o encontrado");
        }

        Map<String, String> ext = privateExt(ev);
        if (isExpiredPending(ext)) {
            throw new NotFoundException("Agendamento n\u00e3o encontrado");
        }

        Servico s = fromEvent(ev);
        s.setStatus("CONFIRMED");
        s.setPhoneVerifiedAt(Instant.now());
        s.setPendingExpiresAt(null);

        calendarClient.updateEvent(s);

        pendingStore.deleteByEventId(sess.scopeId);
        store.delete(verificationId);
    }

    private static Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) {
            return Collections.emptyMap();
        }
        if (e.getExtendedProperties().getPrivate() == null) {
            return Collections.emptyMap();
        }
        return e.getExtendedProperties().getPrivate();
    }

    private static boolean isExpiredPending(Map<String, String> ext) {
        String status = ext.getOrDefault("status", "");
        if (!"PENDING_PHONE".equalsIgnoreCase(status)) {
            return false;
        }

        String pe = ext.get("pendingExpiresAt");
        if (pe == null || !pe.matches("\\d+")) {
            return false;
        }

        long exp = Long.parseLong(pe);
        return Instant.now().getEpochSecond() > exp;
    }

    private static Servico fromEvent(Event e) {
        Map<String, String> ext = privateExt(e);

        Servico s = new Servico();
        s.setEventId(e.getId());

        String serviceType = ext.getOrDefault("serviceType", "");
        if (serviceType.isBlank()) {
            serviceType = (e.getSummary() == null ? "" : e.getSummary());
        }
        s.setTitle(serviceType);

        String serviceNotes = ext.getOrDefault("serviceNotes", "").trim();
        if (serviceNotes.isBlank() && e.getDescription() != null) {
            serviceNotes = e.getDescription().trim();
        }
        s.setDescription(serviceNotes);
        s.setServiceNotes(serviceNotes);

        if (e.getStart() != null && e.getStart().getDateTime() != null) {
            s.setStart(Instant.ofEpochMilli(e.getStart().getDateTime().getValue()));
        }
        if (e.getEnd() != null && e.getEnd().getDateTime() != null) {
            s.setEnd(Instant.ofEpochMilli(e.getEnd().getDateTime().getValue()));
        }

        s.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        s.setClientLastName(ext.getOrDefault("clientLastName", ""));
        s.setClientEmail(ext.getOrDefault("clientEmail", ""));
        s.setClientPhone(ext.getOrDefault("clientPhone", ""));

        s.setClientCep(ext.getOrDefault("clientCep", ""));
        s.setClientStreet(ext.getOrDefault("clientStreet", ""));
        s.setClientNeighborhood(ext.getOrDefault("clientNeighborhood", ""));
        s.setClientNumber(ext.getOrDefault("clientNumber", ""));
        s.setClientComplement(ext.getOrDefault("clientComplement", ""));
        s.setClientCity(ext.getOrDefault("clientCity", ""));
        s.setClientState(ext.getOrDefault("clientState", ""));

        s.setStatus(ext.getOrDefault("status", "PENDING_PHONE"));

        String pe = ext.get("pendingExpiresAt");
        if (pe != null && pe.matches("\\d+")) {
            s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));
        }

        String pv = ext.get("phoneVerifiedAt");
        if (pv != null && pv.matches("\\d+")) {
            s.setPhoneVerifiedAt(Instant.ofEpochSecond(Long.parseLong(pv)));
        }

        return s;
    }
}
