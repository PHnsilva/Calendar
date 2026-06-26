package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AdminAuthConfirmResponse;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryAdminSessionStore;
import br.com.calendarmate.service.store.InMemoryAdminUserStore;
import br.com.calendarmate.service.store.InMemoryVerificationStore;
import br.com.calendarmate.service.store.VerificationStore;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.time.Duration;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AdminAuthServiceTest {
    @Test
    void classifiesAdminUserStoreFailuresBeforeCallingOtpProvider() {
        AdminAuthService service = new AdminAuthService(
                new FailingAdminUserStore(),
                new NoopAdminSessionStore(),
                new NoopVerificationStore(),
                new FailingOtpDeliveryClient(),
                new AppProperties());

        ExternalServiceException ex = assertThrows(
                ExternalServiceException.class,
                () -> service.start("11987654321"));

        assertEquals("AUTH_DEPENDENCY_UNAVAILABLE", ex.getErrorCode());
        assertEquals("admin_user_store", ex.getProviderName());
    }

    @Test
    void bestEffortAdminPhoneLookupDoesNotBlockClientFlowsWhenStoreFails() {
        AdminAuthService service = new AdminAuthService(
                new FailingAdminUserStore(),
                new NoopAdminSessionStore(),
                new NoopVerificationStore(),
                new FailingOtpDeliveryClient(),
                new AppProperties());

        assertFalse(service.isAdminPhoneBestEffort("+55 31 99999-9999"));
    }

    @Test
    void confirmCreatesAdminSessionThatRequireAccepts() {
        InMemoryAdminUserStore userStore = new InMemoryAdminUserStore("+55 31 99999-9999|Owner|OWNER");
        InMemoryAdminSessionStore sessionStore = new InMemoryAdminSessionStore();
        InMemoryVerificationStore verificationStore = new InMemoryVerificationStore();
        RecordingOtpDeliveryClient otpDeliveryClient = new RecordingOtpDeliveryClient();
        AdminAuthService service = new AdminAuthService(
                userStore,
                sessionStore,
                verificationStore,
                otpDeliveryClient,
                new TestAppProperties());

        String verificationId = service.start("+55 31 99999-9999").getVerificationId();
        VerificationStore.Session otp = verificationStore.get(verificationId);

        AdminAuthConfirmResponse confirmed = service.confirm(verificationId, otp.code);

        assertNotNull(confirmed.getSessionToken());
        assertTrue(confirmed.getSessionToken().startsWith("adm_"));
        assertEquals("OWNER", confirmed.getAdmin().getRole());
        assertNull(verificationStore.get(verificationId));

        AdminPrincipal principal = service.require(confirmed.getSessionToken());
        assertTrue(principal.isOwner());
        assertEquals("Owner", principal.getName());
    }

    @Test
    void providerCannotListProvidersButOwnerCan() {
        InMemoryAdminUserStore userStore = new InMemoryAdminUserStore(
                "+55 31 99999-9999|Owner|OWNER;+55 31 98888-8888|Provider|PROVIDER");
        AdminAuthService service = new AdminAuthService(
                userStore,
                new InMemoryAdminSessionStore(),
                new InMemoryVerificationStore(),
                new RecordingOtpDeliveryClient(),
                new TestAppProperties());
        AdminPrincipal owner = new AdminPrincipal(userStore.findActiveByPhone("31999999999"), null);
        AdminPrincipal provider = new AdminPrincipal(userStore.findActiveByPhone("31988888888"), null);

        assertThrows(ForbiddenException.class, () -> service.listProviders(provider));
        assertEquals(1, service.listProviders(owner).size());
        assertTrue(owner.permissions().contains("ASSIGN_PROVIDER"));
        assertFalse(provider.permissions().contains("ASSIGN_PROVIDER"));
        assertEquals(AdminRole.PROVIDER, provider.getRole());
    }

    @Test
    void ownerCanSelectProviderWorkspaceAndProviderCannotSelectAnotherProvider() {
        InMemoryAdminUserStore userStore = new InMemoryAdminUserStore(
                "+55 31 99999-9999|Owner|OWNER|owner-1;+55 31 98888-8888|Provider One|PROVIDER|provider-1;+55 31 97777-7777|Provider Two|PROVIDER|provider-2");
        InMemoryAdminSessionStore sessionStore = new InMemoryAdminSessionStore();
        InMemoryVerificationStore verificationStore = new InMemoryVerificationStore();
        AdminAuthService service = new AdminAuthService(
                userStore,
                sessionStore,
                verificationStore,
                new RecordingOtpDeliveryClient(),
                new TestAppProperties());

        String ownerToken = confirmToken(service, verificationStore, "+55 31 99999-9999");
        String providerToken = confirmToken(service, verificationStore, "+55 31 98888-8888");

        AdminPrincipal ownerAsProvider = service.require(ownerToken, "PROVIDER", "provider-2");
        assertTrue(ownerAsProvider.isProvider());
        assertEquals("provider-2", ownerAsProvider.getId());
        assertEquals("owner-1", ownerAsProvider.getAuthenticatedId());
        assertThrows(ForbiddenException.class, () -> service.requireOwner(ownerToken, "PROVIDER", "provider-2"));

        AdminPrincipal providerSelf = service.require(providerToken, "PROVIDER", "provider-1");
        assertEquals("provider-1", providerSelf.getId());
        assertThrows(ForbiddenException.class, () -> service.require(providerToken, "PROVIDER", "provider-2"));
        assertThrows(ForbiddenException.class, () -> service.require(providerToken, "ADMIN", null));
    }

    @Test
    void requireOwnerAcceptsOwnerSessionAndRejectsProviderSession() {
        InMemoryAdminUserStore userStore = new InMemoryAdminUserStore(
                "+55 31 99999-9999|Owner|OWNER;+55 31 98888-8888|Provider|PROVIDER");
        InMemoryAdminSessionStore sessionStore = new InMemoryAdminSessionStore();
        InMemoryVerificationStore verificationStore = new InMemoryVerificationStore();
        AdminAuthService service = new AdminAuthService(
                userStore,
                sessionStore,
                verificationStore,
                new RecordingOtpDeliveryClient(),
                new TestAppProperties());

        String ownerToken = confirmToken(service, verificationStore, "+55 31 99999-9999");
        String providerToken = confirmToken(service, verificationStore, "+55 31 98888-8888");

        assertTrue(service.requireOwner(ownerToken).isOwner());
        assertThrows(ForbiddenException.class, () -> service.requireOwner(providerToken));
    }

    private static String confirmToken(
            AdminAuthService service,
            InMemoryVerificationStore verificationStore,
            String phone) {
        String verificationId = service.start(phone).getVerificationId();
        VerificationStore.Session otp = verificationStore.get(verificationId);
        return service.confirm(verificationId, otp.code).getSessionToken();
    }

    private static class FailingAdminUserStore implements AdminUserStore {
        @Override
        public AdminUser findActiveByPhone(String phoneDigits) {
            throw new ResourceAccessException("Connection refused");
        }

        @Override
        public AdminUser findActiveById(String id) {
            return null;
        }

        @Override
        public List<AdminUser> listActive() {
            return List.of();
        }

        @Override
        public void updateLastLogin(String id, long epochSec) {
        }
    }

    private static class NoopAdminSessionStore implements AdminSessionStore {
        @Override
        public void save(AdminSession session) {
        }

        @Override
        public AdminSession findActiveByTokenHash(String tokenHash, long nowEpochSec) {
            return null;
        }

        @Override
        public void touch(String sessionId, long nowEpochSec) {
        }

        @Override
        public void revokeByTokenHash(String tokenHash, long nowEpochSec) {
        }

        @Override
        public int deleteExpired(long nowEpochSec) {
            return 0;
        }
    }

    private static class NoopVerificationStore implements VerificationStore {
        @Override
        public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
            throw new AssertionError("verification store should not be called");
        }

        @Override
        public Session get(String verificationId) {
            return null;
        }

        @Override
        public void delete(String verificationId) {
        }

        @Override
        public Session refreshResend(String verificationId, long resendAfterSeconds) {
            return null;
        }
    }

    private static class FailingOtpDeliveryClient implements OtpDeliveryClient {
        @Override
        public void sendCode(String phoneDigits, String code) {
            throw new AssertionError("OTP provider should not be called");
        }
    }

    private static class RecordingOtpDeliveryClient implements OtpDeliveryClient {
        private String lastPhoneDigits;
        private String lastCode;

        @Override
        public void sendCode(String phoneDigits, String code) {
            lastPhoneDigits = phoneDigits;
            lastCode = code;
        }
    }

    private static class TestAppProperties extends AppProperties {
        @Override
        public Duration getOtpTtl() {
            return Duration.ofMinutes(5);
        }

        @Override
        public Duration getOtpResendAfter() {
            return Duration.ZERO;
        }
    }
}
