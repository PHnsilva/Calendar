package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.RecoverConfirmResponse;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.HistoryRecord;
import br.com.calendarmate.service.store.HistoryStore;
import br.com.calendarmate.service.store.VerificationStore;
import br.com.calendarmate.util.PhoneNumberNormalizer;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class RecoveryService {

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
        String phoneDigits = PhoneNumberNormalizer.normalizeBrazilianPhone(phoneRaw);
        if (adminAuthService.isAdminPhone(phoneDigits)) {
            throw new BadRequestException("Use o acesso administrativo para este telefone");
        }

        VerificationStore.Session sess = verificationStore.create(
                "recovery:" + phoneDigits,
                phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        sendOtp(phoneDigits, sess.code);
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
        try {
            otpDeliveryClient.sendCode(phone, code);
        } catch (BadRequestException | ExternalServiceException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ExternalServiceException("Falha de comunicacao com servico externo.", ex);
        }
    }
}
