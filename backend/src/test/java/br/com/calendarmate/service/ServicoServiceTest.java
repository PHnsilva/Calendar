package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryBookingHistoryStore;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.google.api.client.util.DateTime;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ServicoServiceTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void createCleansPendingEventAndVerificationSessionWhenOtpSendFails() throws IOException {
        AppProperties props = new AppProperties();
        DummyCalendarClient calendar = new DummyCalendarClient();
        InMemoryPendingStore pendingStore = new InMemoryPendingStore();
        TrackingVerificationStore verificationStore = new TrackingVerificationStore();
        TokenUtil tokenUtil = new TokenUtil("test-secret", 600);
        AdminAuthService adminAuthService = adminAuthServiceWithoutAdmins();
        VerificationService verificationService = new VerificationService(
                calendar,
                tokenUtil,
                verificationStore,
                pendingStore,
                new FailingOtpDeliveryClient(),
                props,
                adminAuthService);
        ServicoService service = new ServicoService(
                calendar,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                new AvailabilityPolicyService(calendar, props),
                adminAuthService,
                new InMemoryBookingHistoryStore());

        assertThrows(ExternalServiceException.class, () -> service.create(validRequest(nextAvailableDate(calendar, props))));

        assertTrue(pendingStore.listByPhone("31999999999").isEmpty());
        assertNull(verificationStore.get("vfy_create"));
        assertTrue(calendar.listEventsByPhone(
                new DateTime(Date.from(LocalDate.now(ZONE).minusDays(1).atStartOfDay(ZONE).toInstant())),
                new DateTime(Date.from(LocalDate.now(ZONE).plusMonths(2).atStartOfDay(ZONE).toInstant())),
                "31999999999").isEmpty());
    }

    private static LocalDate nextAvailableDate(DummyCalendarClient calendar, AppProperties props) throws IOException {
        AvailabilityPolicyService policy = new AvailabilityPolicyService(calendar, props);
        LocalDate today = LocalDate.now(ZONE);
        YearMonth current = YearMonth.from(today);
        YearMonth next = current.plusMonths(1);
        for (int offset = 1; offset <= 45; offset++) {
            LocalDate candidate = today.plusDays(offset);
            YearMonth candidateMonth = YearMonth.from(candidate);
            if ((candidateMonth.equals(current) || candidateMonth.equals(next)) && policy.hasAnyAvailability(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("No available test date in booking window");
    }

    private static ServicoRequest validRequest(LocalDate date) {
        ServicoRequest req = new ServicoRequest();
        req.setServiceType("Visita tecnica");
        req.setServiceNotes("Trocar tomada da sala com defeito");
        req.setDate(date);
        req.setTime(LocalTime.of(10, 0));
        req.setClientFirstName("Pedro");
        req.setClientLastName("Silva");
        req.setClientEmail("pedro@example.com");
        req.setClientPhone("+55 31 99999-9999");
        req.setClientCep("35450000");
        req.setClientStreet("Rua Sao Jose");
        req.setClientNeighborhood("Centro");
        req.setClientNumber("123");
        req.setClientCity("Itabirito");
        req.setClientState("MG");
        return req;
    }

    private static AdminAuthService adminAuthServiceWithoutAdmins() {
        return new AdminAuthService(
                new NoAdminUserStore(),
                new NoopAdminSessionStore(),
                new TrackingVerificationStore(),
                new NoopOtpDeliveryClient(),
                new AppProperties());
    }

    private static class NoAdminUserStore implements AdminUserStore {
        @Override
        public AdminUser findActiveByPhone(String phoneDigits) {
            return null;
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

    private static class NoopOtpDeliveryClient implements OtpDeliveryClient {
        @Override
        public void sendCode(String phoneDigits, String code) {
        }
    }

    private static class FailingOtpDeliveryClient implements OtpDeliveryClient {
        @Override
        public void sendCode(String phoneDigits, String code) {
            throw ExternalServiceException.upstreamFailure("SMS", 502, null);
        }
    }

    private static class TrackingVerificationStore implements VerificationStore {
        private Session session;

        @Override
        public Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds) {
            session = new Session(
                    "vfy_create",
                    scopeId,
                    phoneDigits,
                    "123",
                    Instant.now().plusSeconds(otpTtlSeconds).getEpochSecond(),
                    Instant.now().plusSeconds(resendAfterSeconds).getEpochSecond());
            return session;
        }

        @Override
        public Session get(String verificationId) {
            return session != null && session.verificationId.equals(verificationId) ? session : null;
        }

        @Override
        public void delete(String verificationId) {
            if (session != null && session.verificationId.equals(verificationId)) {
                session = null;
            }
        }

        @Override
        public Session refreshResend(String verificationId, long resendAfterSeconds) {
            if (session == null || !session.verificationId.equals(verificationId)) {
                return null;
            }
            session = session.withResendAllowedAt(Instant.now().plusSeconds(resendAfterSeconds).getEpochSecond());
            return session;
        }
    }
}
