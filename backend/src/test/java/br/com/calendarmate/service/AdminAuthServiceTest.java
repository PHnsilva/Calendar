package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.VerificationStore;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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
}
