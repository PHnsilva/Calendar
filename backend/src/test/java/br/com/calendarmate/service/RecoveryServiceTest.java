package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.ReservedAdminPhoneException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminRole;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryHistoryStore;
import br.com.calendarmate.service.store.InMemoryVerificationStore;
import br.com.calendarmate.service.store.VerificationStore;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RecoveryServiceTest {
    @Test
    void clientRecoveryDoesNotFailWhenAdminReservedPhoneLookupIsUnavailable() {
        InMemoryVerificationStore verificationStore = new InMemoryVerificationStore();
        RecordingOtpDeliveryClient otpDeliveryClient = new RecordingOtpDeliveryClient();
        RecoveryService service = new RecoveryService(
                verificationStore,
                new InMemoryHistoryStore(),
                otpDeliveryClient,
                new AppProperties(),
                null,
                null,
                adminAuthServiceWithFailingUserStore());

        RecoveryService.StartResult result = service.start("+55 31 99999-9999");

        assertNotNull(result.verificationId());
        assertEquals("31999999999", otpDeliveryClient.lastPhoneDigits);
        assertEquals("31999999999", verificationStore.get(result.verificationId()).phoneDigits);
    }

    @Test
    void clientRecoveryFailsWhenPhoneIsDefinitelyKnownAsAdmin() {
        RecoveryService service = new RecoveryService(
                new InMemoryVerificationStore(),
                new InMemoryHistoryStore(),
                new RecordingOtpDeliveryClient(),
                new AppProperties(),
                null,
                null,
                adminAuthServiceWithKnownAdmin());

        assertThrows(ReservedAdminPhoneException.class, () -> service.start("+55 31 99999-9999"));
    }

    @Test
    void resendUsesExistingRecoveryVerificationSession() {
        ReadyVerificationStore verificationStore = new ReadyVerificationStore();
        RecordingOtpDeliveryClient otpDeliveryClient = new RecordingOtpDeliveryClient();
        RecoveryService service = new RecoveryService(
                verificationStore,
                new InMemoryHistoryStore(),
                otpDeliveryClient,
                new AppProperties(),
                null,
                null,
                adminAuthServiceWithFailingUserStore());

        RecoveryService.StartResult result = service.resend("vfy_recovery");

        assertEquals("vfy_recovery", result.verificationId());
        assertEquals("31999999999", otpDeliveryClient.lastPhoneDigits);
        assertEquals(1, verificationStore.refreshCount);
    }

    private static AdminAuthService adminAuthServiceWithFailingUserStore() {
        return new AdminAuthService(
                new FailingAdminUserStore(),
                new NoopAdminSessionStore(),
                new InMemoryVerificationStore(),
                new RecordingOtpDeliveryClient(),
                new AppProperties());
    }

    private static AdminAuthService adminAuthServiceWithKnownAdmin() {
        return new AdminAuthService(
                new KnownAdminUserStore(),
                new NoopAdminSessionStore(),
                new InMemoryVerificationStore(),
                new RecordingOtpDeliveryClient(),
                new AppProperties());
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

    private static class KnownAdminUserStore implements AdminUserStore {
        private final AdminUser user = new AdminUser(
                "admin-1",
                "31999999999",
                "Admin",
                AdminRole.PROVIDER,
                true,
                0,
                0);

        @Override
        public AdminUser findActiveByPhone(String phoneDigits) {
            return "31999999999".equals(phoneDigits) ? user : null;
        }

        @Override
        public AdminUser findActiveById(String id) {
            return user.getId().equals(id) ? user : null;
        }

        @Override
        public List<AdminUser> listActive() {
            return List.of(user);
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

    private static class RecordingOtpDeliveryClient implements OtpDeliveryClient {
        private String lastPhoneDigits;

        @Override
        public void sendCode(String phoneDigits, String code) {
            lastPhoneDigits = phoneDigits;
        }
    }

    private static class ReadyVerificationStore implements VerificationStore {
        private Session session = new Session(
                "vfy_recovery",
                "recovery:31999999999",
                "31999999999",
                "123",
                Instant.now().plusSeconds(300).getEpochSecond(),
                0);
        private int refreshCount;

        @Override
        public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
            throw new AssertionError("create should not be called when resending");
        }

        @Override
        public Session get(String verificationId) {
            return "vfy_recovery".equals(verificationId) ? session : null;
        }

        @Override
        public void delete(String verificationId) {
            session = null;
        }

        @Override
        public Session refreshResend(String verificationId, long resendAfterSeconds) {
            refreshCount++;
            if (!"vfy_recovery".equals(verificationId)) {
                return null;
            }
            session = session.withResendAllowedAt(Instant.now().plusSeconds(resendAfterSeconds).getEpochSecond());
            return session;
        }
    }
}
