package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.RecoverConfirmResponse;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ReservedAdminPhoneException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.HistoryRecord;
import br.com.calendarmate.service.store.HistoryStore;
import br.com.calendarmate.service.store.VerificationStore;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class RecoveryService {
    private static final Logger log = LoggerFactory.getLogger(RecoveryService.class);

    public record StartResult(String verificationId, long expiresInSeconds, long resendAfterSeconds) {}

    private final VerificationStore verificationStore;
    private final HistoryStore historyStore;
    private final OtpDeliveryClient otpDeliveryClient;
    private final AppProperties props;
    private final ServicoService servicoService;
    private final TokenUtil tokenUtil;
    private final AdminAuthService adminAuthService;

    public RecoveryService(
            VerificationStore verificationStore,
            HistoryStore historyStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props,
            ServicoService servicoService,
            TokenUtil tokenUtil,
            AdminAuthService adminAuthService
    ) {
        this.verificationStore = verificationStore;
        this.historyStore = historyStore;
        this.otpDeliveryClient = otpDeliveryClient;
        this.props = props;
        this.servicoService = servicoService;
        this.tokenUtil = tokenUtil;
        this.adminAuthService = adminAuthService;
    }

    public StartResult start(String phoneRaw) {
        String phoneDigits = PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phoneRaw);
        String maskedPhone = PhoneNumberNormalizer.maskBrazilianPhone(phoneDigits);
        if (adminAuthService.isAdminPhoneBestEffort(phoneDigits)) {
            throw new ReservedAdminPhoneException("Use o acesso administrativo para este telefone.");
        }

        VerificationStore.Session sess = verificationStore.create(
                "recovery:" + phoneDigits,
                phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        try {
            sendOtp(phoneDigits, sess.code);
        } catch (RuntimeException ex) {
            verificationStore.delete(sess.verificationId);
            throw ex;
        }
        log.info("Verification flow started flow=client_recovery phone={} verificationId={}", maskedPhone, sess.verificationId);
        historyStore.append(new HistoryRecord(
                "h_" + UUID.randomUUID(),
                "RECOVER_START",
                phoneDigits,
                null,
                Instant.now().getEpochSecond(),
                null
        ));

        return new StartResult(sess.verificationId, props.getOtpTtl().toSeconds(), props.getOtpResendAfter().toSeconds());
    }

    public StartResult resend(String verificationId) {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("verificationId invalido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("Codigo expirou");
        }
        if (!sess.canResend()) {
            throw new BadRequestException("Aguarde para reenviar o codigo");
        }

        sess = verificationStore.refreshResend(verificationId, props.getOtpResendAfter().toSeconds());
        if (sess == null) {
            throw new BadRequestException("verificationId invalido");
        }

        sendOtp(sess.phoneDigits, sess.code);
        log.info("Verification flow resend flow=client_recovery phone={} verificationId={}", PhoneNumberNormalizer.maskBrazilianPhone(sess.phoneDigits), sess.verificationId);
        return new StartResult(sess.verificationId, Math.max(0, sess.expiresAtEpochSec - Instant.now().getEpochSecond()), props.getOtpResendAfter().toSeconds());
    }

    public RecoverConfirmResponse confirm(String verificationId, String code) throws IOException {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("Codigo invalido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("Codigo expirou");
        }
        if (!sess.code.equals(code)) {
            throw new BadRequestException("Codigo invalido");
        }

        List<ServicoResponse> servicos = servicoService.confirmPendingByPhone(sess.phoneDigits);
        for (ServicoResponse servico : servicos) {
            String email = servico.getClientEmail();
            if (email != null && !email.isBlank()) {
                servico.setManageToken(tokenUtil.generate(servico.getEventId(), email));
            }
        }

        verificationStore.delete(verificationId);
        historyStore.append(new HistoryRecord(
                "h_" + UUID.randomUUID(),
                "RECOVER_CONFIRM",
                sess.phoneDigits,
                null,
                Instant.now().getEpochSecond(),
                "count=" + servicos.size()
        ));

        return new RecoverConfirmResponse(true, servicos);
    }

    private void sendOtp(String phone, String code) {
        logOtpCodeIfEnabled("client_recovery", phone, code);
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
}
