package br.com.calendarmate.verification.application;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.exception.NotFoundException;
import br.com.calendarmate.exception.ReservedAdminPhoneException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.PendingRecord;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.TokenUtil;
import br.com.calendarmate.service.store.PendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import com.google.api.services.calendar.model.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Instant;
import java.util.Collections;
import java.util.Map;

/**
 * Application use case for starting client booking phone verification.
 */
@Service
public class StartVerificationUseCase {
    private static final Logger log = LoggerFactory.getLogger(StartVerificationUseCase.class);

    public record Result(
            String verificationId,
            long expiresInSeconds,
            long resendAfterSeconds
    ) {
    }

    private final CalendarClient calendarClient;
    private final TokenUtil tokenUtil;
    private final VerificationStore store;
    private final PendingStore pendingStore;
    private final OtpDeliveryClient otpDeliveryClient;
    private final AppProperties props;
    private final AdminAuthService adminAuthService;

    public StartVerificationUseCase(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            @Qualifier("verificationStore") VerificationStore store,
            @Qualifier("pendingStore") PendingStore pendingStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props,
            AdminAuthService adminAuthService) {
        this.calendarClient = calendarClient;
        this.tokenUtil = tokenUtil;
        this.store = store;
        this.pendingStore = pendingStore;
        this.otpDeliveryClient = otpDeliveryClient;
        this.props = props;
        this.adminAuthService = adminAuthService;
    }

    public Result execute(String token, String phoneRaw) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) {
            throw new ForbiddenException("Token inv\u00e1lido ou expirado");
        }

        String eventId = vt.getEventId();
        Event ev = calendarClient.getEvent(eventId);
        if (ev == null) {
            throw new NotFoundException("Agendamento n\u00e3o encontrado");
        }

        Map<String, String> ext = privateExt(ev);
        if (isExpiredPending(ext)) {
            throw new NotFoundException("Agendamento n\u00e3o encontrado");
        }

        String status = ext.getOrDefault("status", "PENDING_PHONE");
        if (!"PENDING_PHONE".equalsIgnoreCase(status)) {
            throw new BadRequestException("Agendamento j\u00e1 confirmado");
        }

        String phoneDigits = normalizePhone(phoneRaw);
        String maskedPhone = PhoneNumberNormalizer.maskBrazilianPhone(phoneDigits);
        log.info("Verification start requested eventId={} phone={}", eventId, maskedPhone);
        if (adminAuthService.isAdminPhoneBestEffort(phoneDigits)) {
            throw new ReservedAdminPhoneException("Use o acesso administrativo para este telefone.");
        }

        Servico s = fromEvent(ev);
        s.setClientPhone(phoneDigits);
        s.setStatus("PENDING_PHONE");

        String pendingExpiresRaw = ext.get("pendingExpiresAt");
        long pendingExpiresAt = Instant.now().plus(props.getPendingTtl()).getEpochSecond();

        if (pendingExpiresRaw != null && pendingExpiresRaw.matches("\\d+")) {
            pendingExpiresAt = Long.parseLong(pendingExpiresRaw);
        }

        s.setPendingExpiresAt(Instant.ofEpochSecond(pendingExpiresAt));

        calendarClient.updateEvent(s);

        pendingStore.upsert(new PendingRecord(
                eventId,
                phoneDigits,
                pendingExpiresAt,
                Instant.now().getEpochSecond()
        ));

        VerificationStore.Session sess = store.create(
                eventId,
                phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        try {
            sendOtp(phoneDigits, sess.code);
        } catch (RuntimeException ex) {
            store.delete(sess.verificationId);
            pendingStore.deleteByEventId(eventId);
            throw ex;
        }
        log.info("Verification flow started flow=client_booking phone={} verificationId={}", maskedPhone, sess.verificationId);

        return new Result(
                sess.verificationId,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );
    }

    private void sendOtp(String phone, String code) {
        logOtpCodeIfEnabled("client_verify", phone, code);
        try {
            otpDeliveryClient.sendCode(phone, code);
        } catch (BadRequestException | ExternalServiceException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ExternalServiceException("Falha de comunicacao com servico externo.", ex);
        }
    }

    private void logOtpCodeIfEnabled(String flow, String phone, String code) {
        if (!props.isOtpDebugLoggingEnabled()) {
            return;
        }
        log.info(
                "OTP debug flow={} phone={} code={}",
                flow,
                PhoneNumberNormalizer.maskBrazilianPhone(phone),
                code == null ? "" : code.trim());
    }

    private static String normalizePhone(String phone) {
        return PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phone);
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
