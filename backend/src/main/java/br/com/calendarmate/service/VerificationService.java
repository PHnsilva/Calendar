package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.service.store.PendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import br.com.calendarmate.verification.application.ConfirmVerificationUseCase;
import br.com.calendarmate.verification.application.StartVerificationUseCase;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Instant;

public class VerificationService {
    private static final Logger log = LoggerFactory.getLogger(VerificationService.class);

    public record StartResult(
            String verificationId,
            long expiresInSeconds,
            long resendAfterSeconds
    ) {
    }

    private final VerificationStore store;
    private final OtpDeliveryClient otpDeliveryClient;
    private final AppProperties props;
    private final StartVerificationUseCase startVerificationUseCase;
    private final ConfirmVerificationUseCase confirmVerificationUseCase;

    public VerificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationStore store,
            PendingStore pendingStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props,
            AdminAuthService adminAuthService
    ) {
        this(
                new StartVerificationUseCase(
                        calendarClient,
                        tokenUtil,
                        store,
                        pendingStore,
                        otpDeliveryClient,
                        props,
                        adminAuthService),
                new ConfirmVerificationUseCase(calendarClient, store, pendingStore),
                store,
                otpDeliveryClient,
                props);
    }

    public VerificationService(
            StartVerificationUseCase startVerificationUseCase,
            ConfirmVerificationUseCase confirmVerificationUseCase,
            VerificationStore store,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props
    ) {
        this.startVerificationUseCase = startVerificationUseCase;
        this.confirmVerificationUseCase = confirmVerificationUseCase;
        this.store = store;
        this.otpDeliveryClient = otpDeliveryClient;
        this.props = props;
    }

    public StartResult start(String token, String phoneRaw) throws IOException {
        StartVerificationUseCase.Result result = startVerificationUseCase.execute(token, phoneRaw);
        return new StartResult(
                result.verificationId(),
                result.expiresInSeconds(),
                result.resendAfterSeconds());
    }

    public StartResult resend(String verificationId) {
        VerificationStore.Session sess = store.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("verificationId inv\u00e1lido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("C\u00f3digo expirou");
        }
        if (!sess.canResend()) {
            throw new BadRequestException("Aguarde para reenviar o c\u00f3digo");
        }

        sess = store.refreshResend(verificationId, props.getOtpResendAfter().toSeconds());
        if (sess == null) {
            throw new BadRequestException("verificationId inv\u00e1lido");
        }

        sendOtp(sess.phoneDigits, sess.code);
        log.info("Verification flow resend flow=client_booking phone={} verificationId={}", PhoneNumberNormalizer.maskBrazilianPhone(sess.phoneDigits), sess.verificationId);

        return new StartResult(
                sess.verificationId,
                Math.max(0, sess.expiresAtEpochSec - Instant.now().getEpochSecond()),
                props.getOtpResendAfter().toSeconds()
        );
    }

    public void confirm(String verificationId, String code) throws IOException {
        confirmVerificationUseCase.execute(verificationId, code);
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
