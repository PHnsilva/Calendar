package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.RecoverConfirmResponse;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.integrations.WhatsAppClient;
import br.com.calendarmate.model.HistoryRecord;
import br.com.calendarmate.service.store.HistoryStore;
import br.com.calendarmate.service.store.VerificationStore;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public class RecoveryService {

    public record StartResult(String verificationId, long expiresInSeconds, long resendAfterSeconds) {}

    private final VerificationStore verificationStore;
    private final HistoryStore historyStore;
    private final WhatsAppClient whatsAppClient;
    private final AppProperties props;
    private final ServicoService servicoService;

    public RecoveryService(VerificationStore verificationStore, HistoryStore historyStore, WhatsAppClient whatsAppClient, AppProperties props, ServicoService servicoService) {
        this.verificationStore = verificationStore;
        this.historyStore = historyStore;
        this.whatsAppClient = whatsAppClient;
        this.props = props;
        this.servicoService = servicoService;
    }

    public StartResult start(String phoneRaw) {
        String phoneDigits = normalizePhone(phoneRaw);
        VerificationStore.Session sess = verificationStore.create("recovery:" + phoneDigits, phoneDigits, props.getOtpTtl().toSeconds(), props.getOtpResendAfter().toSeconds());
        whatsAppClient.sendCode(phoneDigits, sess.code);
        historyStore.append(new HistoryRecord("h_" + UUID.randomUUID(), "RECOVER_START", phoneDigits, null, Instant.now().getEpochSecond(), null));
        return new StartResult(sess.verificationId, props.getOtpTtl().toSeconds(), props.getOtpResendAfter().toSeconds());
    }

    public StartResult resend(String verificationId) {
        VerificationStore.Session sess = verificationStore.get(verificationId);
        if (sess == null) {
            throw new BadRequestException("verificationId inválido");
        }
        if (sess.isExpired()) {
            throw new BadRequestException("Código expirou");
        }
        if (!sess.canResend()) {
            throw new BadRequestException("Aguarde para reenviar o código");
        }
        sess = verificationStore.refreshResend(verificationId, props.getOtpResendAfter().toSeconds());
        if (sess == null) {
            throw new BadRequestException("verificationId inválido");
        }
        whatsAppClient.sendCode(sess.phoneDigits, sess.code);
        return new StartResult(sess.verificationId, Math.max(0, sess.expiresAtEpochSec - Instant.now().getEpochSecond()), props.getOtpResendAfter().toSeconds());
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

        List<ServicoResponse> servicos = servicoService.listByPhone(sess.phoneDigits);
        verificationStore.delete(verificationId);
        historyStore.append(new HistoryRecord("h_" + UUID.randomUUID(), "RECOVER_CONFIRM", sess.phoneDigits, null, Instant.now().getEpochSecond(), "count=" + (servicos == null ? 0 : servicos.size())));
        return new RecoverConfirmResponse(true, servicos);
    }

    private static String normalizePhone(String phone) {
        String raw = phone == null ? "" : phone;
        StringBuilder digits = new StringBuilder();
        for (int i = 0; i < raw.length(); i++) {
            char c = raw.charAt(i);
            if (Character.isDigit(c)) digits.append(c);
        }
        String d = digits.toString();
        if (d.length() < 10 || d.length() > 11) {
            throw new BadRequestException("Telefone inválido");
        }
        return d;
    }
}
