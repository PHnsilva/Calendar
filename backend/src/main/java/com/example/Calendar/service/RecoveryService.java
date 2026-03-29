package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.RecoverConfirmResponse;
import com.example.Calendar.dto.RecoveryBookingItemResponse;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.model.HistoryRecord;
import com.example.Calendar.service.store.HistoryStore;
import com.example.Calendar.service.store.VerificationStore;

import java.io.IOException;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class RecoveryService {

    public record StartResult(
            String verificationId,
            long expiresInSeconds,
            long resendAfterSeconds
    ) {
    }

    private final VerificationStore verificationStore;
    private final HistoryStore historyStore;
    private final WhatsAppClient whatsAppClient;
    private final AppProperties props;
    private final ServicoService servicoService;
    private final TokenUtil tokenUtil;

    public RecoveryService(
            VerificationStore verificationStore,
            HistoryStore historyStore,
            WhatsAppClient whatsAppClient,
            AppProperties props,
            ServicoService servicoService,
            TokenUtil tokenUtil
    ) {
        this.verificationStore = verificationStore;
        this.historyStore = historyStore;
        this.whatsAppClient = whatsAppClient;
        this.props = props;
        this.servicoService = servicoService;
        this.tokenUtil = tokenUtil;
    }

    public StartResult start(String phoneRaw) {
        String phoneDigits = normalizePhone(phoneRaw);

        VerificationStore.Session sess = verificationStore.create(
                "recovery:" + phoneDigits,
                phoneDigits,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );

        whatsAppClient.sendCode(phoneDigits, sess.code);

        historyStore.append(new HistoryRecord(
                "h_" + UUID.randomUUID(),
                "RECOVER_START",
                phoneDigits,
                null,
                Instant.now().getEpochSecond(),
                null
        ));

        return toStartResult(sess);
    }

    public StartResult resend(String verificationId) {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("verificationId inválido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("Código expirou");
        }
        if (!sess.scopeId.startsWith("recovery:")) {
            throw new BadRequestException("verificationId inválido");
        }
        if (!sess.canResend()) {
            throw new BadRequestException("Aguarde para reenviar o código");
        }

        sess = verificationStore.refreshResend(verificationId, props.getOtpResendAfter().toSeconds());
        if (sess == null) {
            throw new BadRequestException("verificationId inválido");
        }

        whatsAppClient.sendCode(sess.phoneDigits, sess.code);
        return toStartResult(sess);
    }

    public RecoverConfirmResponse confirm(String verificationId, String code) throws IOException {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("Código inválido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("Código expirou");
        }
        if (!sess.code.equals(code)) {
            throw new BadRequestException("Código inválido");
        }
        if (!sess.scopeId.startsWith("recovery:")) {
            throw new BadRequestException("Código inválido");
        }

        List<ServicoResponse> servicos = servicoService.listByPhone(sess.phoneDigits).stream()
                .sorted(Comparator.comparing(ServicoResponse::getStart, Comparator.nullsLast(Comparator.naturalOrder())))
                .collect(Collectors.toList());

        List<RecoveryBookingItemResponse> items = servicos.stream()
                .map(this::toRecoveryItem)
                .collect(Collectors.toList());

        List<String> tokens = items.stream()
                .map(RecoveryBookingItemResponse::getManageToken)
                .collect(Collectors.toList());

        verificationStore.delete(verificationId);

        historyStore.append(new HistoryRecord(
                "h_" + UUID.randomUUID(),
                "RECOVER_CONFIRM",
                sess.phoneDigits,
                null,
                Instant.now().getEpochSecond(),
                "count=" + servicos.size()
        ));

        return new RecoverConfirmResponse(true, servicos, tokens, items);
    }

    private RecoveryBookingItemResponse toRecoveryItem(ServicoResponse servico) {
        String token = tokenUtil.generate(servico.getEventId(), servico.getClientEmail());
        return new RecoveryBookingItemResponse(servico, token);
    }

    private StartResult toStartResult(VerificationStore.Session sess) {
        long expiresInSeconds = Math.max(0, sess.expiresAtEpochSec - Instant.now().getEpochSecond());
        return new StartResult(
                sess.verificationId,
                expiresInSeconds,
                props.getOtpResendAfter().toSeconds()
        );
    }

    private static String normalizePhone(String phone) {
        String d = (phone == null) ? "" : phone.replaceAll("\\D", "");
        if (d.length() < 10 || d.length() > 11) {
            throw new BadRequestException("Telefone inválido");
        }
        return d;
    }
}
