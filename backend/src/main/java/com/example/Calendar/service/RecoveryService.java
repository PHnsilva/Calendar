package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.RecoverConfirmResponse;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.model.HistoryRecord;
import com.example.Calendar.service.store.HistoryStore;
import com.example.Calendar.service.store.PendingStore;
import com.example.Calendar.service.store.VerificationStore;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class RecoveryService {

    private final VerificationStore verificationStore;
    private final PendingStore pendingStore;
    private final HistoryStore historyStore;
    private final WhatsAppClient whatsAppClient;
    private final AppProperties props;
    private final ServicoService servicoService;

    public record StartResult(String verificationId, long expiresInSeconds, long resendAfterSeconds) {}

    public RecoveryService(
            VerificationStore verificationStore,
            PendingStore pendingStore,
            HistoryStore historyStore,
            WhatsAppClient whatsAppClient,
            AppProperties props,
            ServicoService servicoService
    ) {
        this.verificationStore = verificationStore;
        this.pendingStore = pendingStore;
        this.historyStore = historyStore;
        this.whatsAppClient = whatsAppClient;
        this.props = props;
        this.servicoService = servicoService;
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

        // histórico
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

    public RecoverConfirmResponse confirm(String verificationId, String code) throws IOException {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) throw new BadRequestException("Código inválido");
        if (sess.isExpired()) throw new BadRequestException("Código expirou");
        if (!sess.code.equals(code)) throw new BadRequestException("Código inválido");

        List<ServicoResponse> servicos = servicoService.listByPhone(sess.phoneDigits);

        verificationStore.delete(verificationId);

        historyStore.append(new HistoryRecord(
                "h_" + UUID.randomUUID(),
                "RECOVER_CONFIRM",
                sess.phoneDigits,
                null,
                Instant.now().getEpochSecond(),
                "count=" + (servicos == null ? 0 : servicos.size())
        ));

        return new RecoverConfirmResponse(true, servicos);
    }

    private static String normalizePhone(String phone) {
        String d = (phone == null) ? "" : phone.replaceAll("\\D", "");
        if (d.length() < 10 || d.length() > 11) throw new BadRequestException("Telefone inválido");
        return d;
    }
}