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
import br.com.calendarmate.model.AdminRole;
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
        String phone = PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phoneRaw);
        String maskedPhone = PhoneNumberNormalizer.maskBrazilianPhone(phone);
        log.info("Admin auth start requested phone={}", maskedPhone);

        AdminUser user = findActiveAdminByPhone(phone, maskedPhone);
        if (user == null) {
            throw new ForbiddenException("Telefone administrativo nao autorizado");
        }

        VerificationStore.Session session = createVerificationSession(user, phone, maskedPhone);
        try {
            sendOtp(phone, session.code);
        } catch (RuntimeException ex) {
            verificationStore.delete(session.verificationId);
            throw ex;
        }
        log.info("Verification flow started flow=admin_login phone={} verificationId={}", maskedPhone, session.verificationId);
        return new AdminAuthStartResponse(
                session.verificationId,
                props.getOtpTtl().toSeconds(),
                props.getOtpResendAfter().toSeconds()
        );
    }

    public AdminAuthStartResponse resend(String verificationId) {
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
        log.info("Verification flow resend flow=admin_login phone={} verificationId={}", PhoneNumberNormalizer.maskBrazilianPhone(session.phoneDigits), session.verificationId);
        return new AdminAuthStartResponse(
                session.verificationId,
                Math.max(0, session.expiresAtEpochSec - Instant.now().getEpochSecond()),
                props.getOtpResendAfter().toSeconds()
        );
    }

    public AdminAuthConfirmResponse confirm(String verificationId, String code) {
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

        AdminAuthConfirmResponse out = createSessionResponse(user);
        verificationStore.delete(verificationId);
        return out;
    }

    public AdminAuthConfirmResponse passwordLogin(String phoneRaw, String passwordRaw) {
        String phone = PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phoneRaw);
        String maskedPhone = PhoneNumberNormalizer.maskBrazilianPhone(phone);
        AdminUser user = findActiveAdminByPhone(phone, maskedPhone);
        if (user == null) {
            throw new ForbiddenException("Telefone administrativo nao autorizado");
        }
        if (!isReservedPhonePasswordValid(passwordRaw)) {
            throw new ForbiddenException("Senha administrativa invalida");
        }
        log.info("Admin password login accepted phone={} role={}", maskedPhone, user.getRole());
        return createSessionResponse(user);
    }

    public boolean isReservedPhonePasswordValid(String passwordRaw) {
        return props.getAdminTempPassword().equals(passwordRaw == null ? "" : passwordRaw.trim());
    }

    private AdminAuthConfirmResponse createSessionResponse(AdminUser user) {
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

        AdminAuthConfirmResponse out = new AdminAuthConfirmResponse();
        out.setSessionToken(rawToken);
        out.setAdmin(toMe(new AdminPrincipal(user, session)));
        return out;
    }

    public AdminPrincipal require(String sessionToken) {
        return require(sessionToken, null, null);
    }

    public AdminPrincipal require(String sessionToken, String workspaceMode, String providerId) {
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
        AdminPrincipal scoped = resolveWorkspacePrincipal(user, session, workspaceMode, providerId);
        if (scoped != null) {
            return scoped;
        }
        return new AdminPrincipal(user, session);
    }

    public AdminPrincipal requireOwner(String sessionToken) {
        return requireOwner(sessionToken, null, null);
    }

    public AdminPrincipal requireOwner(String sessionToken, String workspaceMode, String providerId) {
        AdminPrincipal principal = require(sessionToken, workspaceMode, providerId);
        if (!principal.isOwner() || principal.isWorkspaceScoped()) {
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
        return !phone.isBlank() && findActiveAdminByPhone(phone, PhoneNumberNormalizer.maskBrazilianPhone(phone)) != null;
    }

    public boolean isAdminPhoneBestEffort(String phoneRaw) {
        String phone = PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(phoneRaw);
        if (phone.isBlank()) {
            return false;
        }
        String maskedPhone = PhoneNumberNormalizer.maskBrazilianPhone(phone);
        try {
            return findActiveAdminByPhone(phone, maskedPhone) != null;
        } catch (ExternalServiceException ex) {
            log.warn(
                    "Admin phone best-effort lookup skipped phone={} code={} dependency={} status={}",
                    maskedPhone,
                    ex.getErrorCode(),
                    ex.getProviderName() == null ? "admin_user_store" : ex.getProviderName(),
                    ex.getProviderStatus() == null ? "n/a" : ex.getProviderStatus());
            return false;
        } catch (RuntimeException ex) {
            log.warn(
                    "Admin phone best-effort lookup skipped phone={} exceptionClass={} exceptionMessage={}",
                    maskedPhone,
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            return false;
        }
    }

    public List<AdminProviderResponse> listProviders(AdminPrincipal principal) {
        if (!principal.isOwner()) {
            throw new ForbiddenException("Acesso permitido apenas ao OWNER");
        }
        return adminUserStore.listActive().stream()
                .filter(user -> user.getRole() == AdminRole.PROVIDER)
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
        if (user.getRole() != AdminRole.PROVIDER) {
            throw new BadRequestException("Usuario informado nao e prestador");
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

    private AdminPrincipal resolveWorkspacePrincipal(AdminUser authenticated, AdminSession session, String workspaceMode, String providerId) {
        String mode = workspaceMode == null ? "" : workspaceMode.trim().toUpperCase(java.util.Locale.ROOT);
        String selectedProviderId = providerId == null ? "" : providerId.trim();

        if ("ADMIN".equals(mode)) {
            if (!authenticated.isOwner()) {
                throw new ForbiddenException("Acesso permitido apenas ao OWNER");
            }
            return new AdminPrincipal(authenticated, session);
        }

        if ("PROVIDER".equals(mode)) {
            AdminUser provider = selectedProviderId.isBlank()
                    ? authenticated
                    : adminUserStore.findActiveById(selectedProviderId);
            if (provider == null || provider.getRole() != AdminRole.PROVIDER) {
                throw new ForbiddenException("Prestador nao autorizado");
            }
            if (!authenticated.isOwner() && !authenticated.getId().equals(provider.getId())) {
                throw new ForbiddenException("Prestador nao autorizado para este workspace");
            }
            return new AdminPrincipal(authenticated, provider, session);
        }

        if (!authenticated.isOwner()) {
            if (!selectedProviderId.isBlank() && !authenticated.getId().equals(selectedProviderId)) {
                throw new ForbiddenException("Prestador nao autorizado para este workspace");
            }
            return new AdminPrincipal(authenticated, session);
        }

        return null;
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
        log.info(
                "OTP debug flow={} phone={} code={}",
                flow,
                PhoneNumberNormalizer.maskBrazilianPhone(phone),
                code == null ? "" : code.trim());
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
