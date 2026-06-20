package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AdminAuthConfirmResponse;
import br.com.calendarmate.dto.AdminAuthStartResponse;
import br.com.calendarmate.dto.AdminMeResponse;
import br.com.calendarmate.dto.AdminProviderResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.VerificationStore;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

public class AdminAuthService {
    private static final Logger log = LoggerFactory.getLogger(AdminAuthService.class);
    private static final String SCOPE_PREFIX = "admin:";

    private final AdminUserStore adminUserStore;
    private final AdminSessionStore adminSessionStore;
    private final VerificationStore verificationStore;
    private final OtpDeliveryClient otpDeliveryClient;
    private final AppProperties props;
    private final SecureRandom secureRandom = new SecureRandom();

    public AdminAuthService(
            AdminUserStore adminUserStore,
            AdminSessionStore adminSessionStore,
            VerificationStore verificationStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props
    ) {
        this.adminUserStore = adminUserStore;
        this.adminSessionStore = adminSessionStore;
        this.verificationStore = verificationStore;
        this.otpDeliveryClient = otpDeliveryClient;
        this.props = props;
    }

    public AdminAuthStartResponse start(String phoneRaw) {
        String phone = PhoneNumberNormalizer.normalizeBrazilianPhone(phoneRaw);
        String maskedPhone = maskBrazilianPhone(phone);
        log.info("Admin auth start requested phone={}", maskedPhone);

        AdminUser user = findActiveAdminByPhone(phone, maskedPhone);
        if (user == null) {
            throw new ForbiddenException("Telefone administrativo nao autorizado");
        }

        VerificationStore.Session session = createVerificationSession(user, phone, maskedPhone);
        sendOtp(phone, session.code);
        return new AdminAuthStartResponse(
                session.verificationId,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );
    }

    public AdminAuthStartResponse resend(String verificationId) {
        log.info("Admin auth resend requested verificationId={}", verificationId);
        VerificationStore.Session session = verificationStore.get(verificationId);
        if (session == null || !session.scopeId.startsWith(SCOPE_PREFIX)) {
            throw new BadRequestException("verificationId invalido");
        }
        if (session.isExpired()) {
            throw new BadRequestException("Codigo expirou");
        }
        if (!session.canResend()) {
            throw new BadRequestException("Aguarde para reenviar o codigo");
        }

        session = verificationStore.refreshResend(verificationId, props.getOtpResendAfter().toSeconds());
        if (session == null) {
            throw new BadRequestException("verificationId invalido");
        }

        sendOtp(session.phoneDigits, session.code);
        log.info("Admin auth resend dispatched verificationId={} phone={}", verificationId, maskBrazilianPhone(session.phoneDigits));
        return new AdminAuthStartResponse(
                session.verificationId,
                Math.max(0, session.expiresAtEpochSec - Instant.now().getEpochSecond()),
                props.getOtpResendAfter().toSeconds()
        );
    }

    public AdminAuthConfirmResponse confirm(String verificationId, String code) {
        log.info("Admin auth confirm requested verificationId={}", verificationId);
        VerificationStore.Session otp = verificationStore.get(verificationId);
        if (otp == null || !otp.scopeId.startsWith(SCOPE_PREFIX)) {
            throw new BadRequestException("Codigo invalido");
        }
        if (otp.isExpired()) {
            throw new BadRequestException("Codigo expirou");
        }
        if (!otp.code.equals(code == null ? "" : code.trim())) {
            throw new BadRequestException("Codigo invalido");
        }

        String adminId = otp.scopeId.substring(SCOPE_PREFIX.length());
        AdminUser user = adminUserStore.findActiveById(adminId);
        if (user == null || !PhoneNumberNormalizer.normalizeBrazilianPhone(user.getPhoneDigits()).equals(PhoneNumberNormalizer.normalizeBrazilianPhone(otp.phoneDigits))) {
            throw new ForbiddenException("Administrador nao autorizado");
        }

        long now = Instant.now().getEpochSecond();
        String rawToken = generateToken();
        AdminSession session = new AdminSession(
                "ads_" + UUID.randomUUID(),
                user.getId(),
                hash(rawToken),
                now,
                now + props.getAdminSessionTtl().toSeconds(),
                now,
                null
        );
        adminSessionStore.save(session);
        adminUserStore.updateLastLogin(user.getId(), now);
        verificationStore.delete(verificationId);
        log.info("Admin auth confirm succeeded verificationId={} adminId={}", verificationId, user.getId());

        AdminAuthConfirmResponse out = new AdminAuthConfirmResponse();
        out.setSessionToken(rawToken);
        out.setAdmin(toMe(new AdminPrincipal(user, session)));
        return out;
    }

    public AdminPrincipal require(String sessionToken) {
        String token = cleanToken(sessionToken);
        if (token.isBlank()) {
            throw new ForbiddenException("Sessao administrativa ausente");
        }
        long now = Instant.now().getEpochSecond();
        AdminSession session = adminSessionStore.findActiveByTokenHash(hash(token), now);
        if (session == null) {
            throw new ForbiddenException("Sessao administrativa invalida ou expirada");
        }
        AdminUser user = adminUserStore.findActiveById(session.getAdminUserId());
        if (user == null) {
            throw new ForbiddenException("Administrador desativado");
        }
        adminSessionStore.touch(session.getSessionId(), now);
        return new AdminPrincipal(user, session);
    }

    public AdminPrincipal requireOwner(String sessionToken) {
        AdminPrincipal principal = require(sessionToken);
        if (!principal.isOwner()) {
            throw new ForbiddenException("Acesso permitido apenas ao OWNER");
        }
        return principal;
    }

    public void logout(String sessionToken) {
        String token = cleanToken(sessionToken);
        if (!token.isBlank()) {
            adminSessionStore.revokeByTokenHash(hash(token), Instant.now().getEpochSecond());
        }
    }

    public boolean isAdminPhone(String phoneRaw) {
        String phone = PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(phoneRaw);
        return !phone.isBlank() && findActiveAdminByPhone(phone, maskBrazilianPhone(phone)) != null;
    }

    public List<AdminProviderResponse> listProviders(AdminPrincipal principal) {
        if (!principal.isOwner()) {
            throw new ForbiddenException("Acesso permitido apenas ao OWNER");
        }
        return adminUserStore.listActive().stream()
                .map(user -> new AdminProviderResponse(
                        user.getId(),
                        user.getName(),
                        user.getPhoneDigits(),
                        user.getRole() == null ? "PROVIDER" : user.getRole().name()
                ))
                .toList();
    }

    public AdminUser requireAssignableProvider(String providerId) {
        AdminUser user = adminUserStore.findActiveById(providerId);
        if (user == null) {
            throw new BadRequestException("Prestador nao encontrado");
        }
        return user;
    }

    public AdminMeResponse toMe(AdminPrincipal principal) {
        AdminMeResponse out = new AdminMeResponse();
        out.setId(principal.getId());
        out.setName(principal.getName());
        out.setPhone(principal.getPhoneDigits());
        out.setRole(principal.getRole() == null ? "PROVIDER" : principal.getRole().name());
        out.setPermissions(principal.permissions());
        out.setSessionExpiresAt(principal.getSession() == null ? 0L : principal.getSession().getExpiresAtEpochSec());
        return out;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "adm_" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String cleanToken(String value) {
        if (value == null) {
            return "";
        }
        String token = value.trim();
        if (token.toLowerCase().startsWith("bearer ")) {
            return token.substring(7).trim();
        }
        return token;
    }

    private static String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest((value == null ? "" : value).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hashed);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private void sendOtp(String phone, String code) {
        logOtpCodeIfEnabled("admin_auth", phone, code);
        try {
            otpDeliveryClient.sendCode(phone, code);
        } catch (BadRequestException ex) {
            throw ex;
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new ExternalServiceException("Nao foi possivel enviar o codigo agora", ex);
        }
    }

    private void logOtpCodeIfEnabled(String flow, String phone, String code) {
        if (!props.isOtpDebugLoggingEnabled()) {
            return;
        }
        log.info("OTP debug flow={} phone={} code={}", flow, maskBrazilianPhone(phone), code == null ? "" : code.trim());
    }

    private AdminUser findActiveAdminByPhone(String phone, String maskedPhone) {
        try {
            log.info("Admin auth dependency call phase=admin_user_lookup phone={}", maskedPhone);
            return adminUserStore.findActiveByPhone(phone);
        } catch (ExternalServiceException ex) {
            log.warn(
                    "Admin auth dependency failure phase=admin_user_lookup phone={} code={} dependency={} status={} message={}",
                    maskedPhone,
                    ex.getErrorCode(),
                    ex.getProviderName() == null ? "admin_user_store" : ex.getProviderName(),
                    ex.getProviderStatus() == null ? "n/a" : ex.getProviderStatus(),
                    safeExceptionMessage(ex));
            throw ex;
        } catch (RuntimeException ex) {
            log.warn(
                    "Admin auth dependency failure phase=admin_user_lookup phone={} exceptionClass={} exceptionMessage={}",
                    maskedPhone,
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            throw ExternalServiceException.authDependencyUnavailable("admin_user_store", ex);
        }
    }

    private VerificationStore.Session createVerificationSession(AdminUser user, String phone, String maskedPhone) {
        try {
            log.info("Admin auth dependency call phase=verification_session_create phone={}", maskedPhone);
            return verificationStore.create(
                    SCOPE_PREFIX + user.getId(),
                    phone,
                    props.getOtpTtl().toSeconds(),
                    props.getOtpResendAfter().toSeconds()
            );
        } catch (ExternalServiceException ex) {
            log.warn(
                    "Admin auth dependency failure phase=verification_session_create phone={} code={} dependency={} status={} message={}",
                    maskedPhone,
                    ex.getErrorCode(),
                    ex.getProviderName() == null ? "verification_store" : ex.getProviderName(),
                    ex.getProviderStatus() == null ? "n/a" : ex.getProviderStatus(),
                    safeExceptionMessage(ex));
            throw ex;
        } catch (RuntimeException ex) {
            log.warn(
                    "Admin auth dependency failure phase=verification_session_create phone={} exceptionClass={} exceptionMessage={}",
                    maskedPhone,
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            throw ExternalServiceException.authDependencyUnavailable("verification_store", ex);
        }
    }

    private static String maskBrazilianPhone(String phoneDigits) {
        String digits = PhoneNumberNormalizer.digitsOnly(phoneDigits);
        if (digits.length() == 10 || digits.length() == 11) {
            digits = "55" + digits;
        }
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return "+" + digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
    }

    private static String safeExceptionMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "";
        }
        return message
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("(?i)(apikey|api_key|token|authorization)=([^&\\s]+)", "$1=[redacted]")
                .replaceAll("\\+?55\\d{10,11}", "+55*****0000");
    }
}
