package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.exception.NotFoundException;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.service.TokenUtil.VerifiedToken;
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

public class VerificationService {

    private final CalendarClient calendarClient;
    private final TokenUtil tokenUtil;
    private final InMemoryVerificationStore store;
    private final WhatsAppClient whatsAppClient;
    private final AppProperties props;

    public VerificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            InMemoryVerificationStore store,
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
        VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) throw new ForbiddenException("Token inválido ou expirado");

        String eventId = vt.getEventId();
        Event ev = calendarClient.getEvent(eventId);
        if (ev == null) throw new NotFoundException("Agendamento não encontrado");

        String phoneDigits = normalizePhone(phoneRaw);

        // atualiza telefone no evento (permite edição no modal)
        setPrivate(ev, "clientPhone", phoneDigits);

        // garante status pendente
        String status = getPrivate(ev, "status");
        if (status == null || status.isBlank()) setPrivate(ev, "status", "PENDING_PHONE");

        // salva update
        // (depende de como seu CalendarClient faz update: por Servico ou por Event.
        //  se seu client só atualiza por Servico, a gente ajusta quando você mandar seus arquivos.)

        // cria sessão e envia
        var sess = store.create(eventId, phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        whatsAppClient.sendCode(phoneDigits, sess.code);

        return new StartResult(sess.verificationId, props.getOtpTtl().toSeconds(), props.getOtpResendAfter().toSeconds());
    }

    public void confirm(String verificationId, String code) throws IOException {
        var sess = store.get(verificationId);
        if (sess == null) throw new BadRequestException("Código inválido");
        if (sess.isExpired()) throw new BadRequestException("Código expirou");

        if (!sess.code.equals(code)) throw new BadRequestException("Código inválido");

        Event ev = calendarClient.getEvent(sess.eventId);
        if (ev == null) throw new NotFoundException("Agendamento não encontrado");

        setPrivate(ev, "status", "CONFIRMED");
        setPrivate(ev, "phoneVerifiedAt", String.valueOf(Instant.now().getEpochSecond()));

        // persistir update (ajustaremos quando você mandar seu CalendarClient/Service)

        store.delete(verificationId);
    }

    private static String normalizePhone(String phone) {
        return phone == null ? "" : phone.replaceAll("\\D", "");
    }

    private static String getPrivate(Event ev, String key) {
        if (ev.getExtendedProperties() == null) return null;
        Map<String, String> p = ev.getExtendedProperties().getPrivate();
        if (p == null) return null;
        return p.get(key);
    }

    private static void setPrivate(Event ev, String key, String value) {
        if (ev.getExtendedProperties() == null) {
            ev.setExtendedProperties(new Event.ExtendedProperties());
        }
        Map<String, String> p = ev.getExtendedProperties().getPrivate();
        if (p == null) p = new HashMap<>();
        p.put(key, value);
        ev.getExtendedProperties().setPrivate(p);
    }
}