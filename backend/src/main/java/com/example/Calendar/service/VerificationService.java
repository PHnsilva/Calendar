package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.exception.NotFoundException;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.model.Servico;
import com.example.Calendar.service.store.VerificationStore;
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;

public class VerificationService {

    private final CalendarClient calendarClient;
    private final TokenUtil tokenUtil;
    private final VerificationStore store;
    private final WhatsAppClient whatsAppClient;
    private final AppProperties props;

    public VerificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationStore store,
            WhatsAppClient whatsAppClient,
            AppProperties props
    ) {
        this.calendarClient = calendarClient;
        this.tokenUtil = tokenUtil;
        this.store = store;
        this.whatsAppClient = whatsAppClient;
        this.props = props;
    }

    public record StartResult(String verificationId, long expiresInSeconds, long resendAfterSeconds) {}

    public StartResult start(String token, String phoneRaw) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) throw new ForbiddenException("Token inválido ou expirado");

        String eventId = vt.getEventId();
        Event ev = calendarClient.getEvent(eventId);
        if (ev == null) throw new NotFoundException("Agendamento não encontrado");

        Map<String, String> ext = privateExt(ev);
        if (isExpiredPending(ext)) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        String status = ext.getOrDefault("status", "PENDING_PHONE");
        if (!"PENDING_PHONE".equalsIgnoreCase(status)) {
            throw new BadRequestException("Agendamento já confirmado");
        }

        String phoneDigits = normalizePhone(phoneRaw);

        Servico s = fromEvent(ev);
        s.setClientPhone(phoneDigits);
        s.setStatus("PENDING_PHONE");

        String pe = ext.get("pendingExpiresAt");
        if (pe != null && pe.matches("\\d+")) {
            s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));
        }

        calendarClient.updateEvent(s);

        VerificationStore.Session sess = store.create(
                eventId,
                phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        whatsAppClient.sendCode(phoneDigits, sess.code);

        return new StartResult(sess.verificationId, props.getOtpTtl().toSeconds(), props.getOtpResendAfter().toSeconds());
    }

    public StartResult resend(String verificationId) {
        VerificationStore.Session sess = store.get(verificationId);
        if (sess == null) throw new BadRequestException("verificationId inválido");
        if (sess.isExpired()) throw new BadRequestException("Código expirou");
        if (!sess.canResend()) throw new BadRequestException("Aguarde para reenviar o código");

        whatsAppClient.sendCode(sess.phoneDigits, sess.code);

        return new StartResult(
                sess.verificationId,
                Math.max(0, sess.expiresAtEpochSec - Instant.now().getEpochSecond()),
                Math.max(0, sess.resendAllowedAtEpochSec - Instant.now().getEpochSecond())
        );
    }

    public void confirm(String verificationId, String code) throws IOException {
        VerificationStore.Session sess = store.get(verificationId);
        if (sess == null) throw new BadRequestException("Código inválido");
        if (sess.isExpired()) throw new BadRequestException("Código expirou");
        if (!sess.code.equals(code)) throw new BadRequestException("Código inválido");

        Event ev = calendarClient.getEvent(sess.scopeId);
        if (ev == null) throw new NotFoundException("Agendamento não encontrado");

        Map<String, String> ext = privateExt(ev);
        if (isExpiredPending(ext)) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        Servico s = fromEvent(ev);
        s.setStatus("CONFIRMED");
        s.setPhoneVerifiedAt(Instant.now());
        s.setPendingExpiresAt(null);

        calendarClient.updateEvent(s);

        store.delete(verificationId);
    }

    private static String normalizePhone(String phone) {
        String d = (phone == null) ? "" : phone.replaceAll("\\D", "");
        if (d.length() < 10 || d.length() > 11) throw new BadRequestException("Telefone inválido");
        return d;
    }

    private static Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) return java.util.Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return java.util.Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private static boolean isExpiredPending(Map<String, String> ext) {
        String status = ext.getOrDefault("status", "");
        if (!"PENDING_PHONE".equalsIgnoreCase(status)) return false;

        String pe = ext.get("pendingExpiresAt");
        if (pe == null || !pe.matches("\\d+")) return false;

        long exp = Long.parseLong(pe);
        return Instant.now().getEpochSecond() > exp;
    }

    private static Servico fromEvent(Event e) {
        Map<String, String> ext = privateExt(e);

        Servico s = new Servico();
        s.setEventId(e.getId());

        String serviceType = ext.getOrDefault("serviceType", "");
        if (serviceType.isBlank()) serviceType = (e.getSummary() == null ? "" : e.getSummary());
        s.setTitle(serviceType);

        s.setDescription(e.getDescription() == null ? "" : e.getDescription());

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
        if (pe != null && pe.matches("\\d+")) s.setPendingExpiresAt(Instant.ofEpochSecond(Long.parseLong(pe)));

        String pv = ext.get("phoneVerifiedAt");
        if (pv != null && pv.matches("\\d+")) s.setPhoneVerifiedAt(Instant.ofEpochSecond(Long.parseLong(pv)));

        return s;
    }
}