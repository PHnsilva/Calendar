package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.model.AdminSession;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.model.Servico;
import br.com.calendarmate.service.store.AdminSessionStore;
import br.com.calendarmate.service.store.AdminUserStore;
import br.com.calendarmate.service.store.InMemoryPendingStore;
import br.com.calendarmate.service.store.InMemoryVerificationStore;
import br.com.calendarmate.service.store.VerificationStore;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class VerificationServiceTest {
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");

    @Test
    void startCreatesVerificationSessionAndSendsDummyOtp() throws IOException {
        Fixture fixture = new Fixture();
        Event event = fixture.createPendingEvent();
        String token = fixture.tokenUtil.generate(event.getId(), "cliente@example.com");

        VerificationService.StartResult result = fixture.service.start(token, "+55 31 99999-9999");

        VerificationStore.Session session = fixture.verificationStore.get(result.verificationId());
        assertNotNull(session);
        assertEquals("31999999999", session.phoneDigits);
        assertEquals(session.code, fixture.otpDeliveryClient.lastCode);
        assertEquals("31999999999", fixture.otpDeliveryClient.lastPhoneDigits);
        assertNotNull(fixture.pendingStore.getByEventId(event.getId()));
    }

    @Test
    void confirmValidCodeConfirmsBookingAndRemovesSession() throws IOException {
        Fixture fixture = new Fixture();
        Event event = fixture.createPendingEvent();
        String token = fixture.tokenUtil.generate(event.getId(), "cliente@example.com");
        VerificationService.StartResult result = fixture.service.start(token, "+55 31 99999-9999");
        VerificationStore.Session session = fixture.verificationStore.get(result.verificationId());

        fixture.service.confirm(result.verificationId(), session.code);

        Event updated = fixture.calendar.getEvent(event.getId());
        assertEquals("CONFIRMED", privateProps(updated).get("status"));
        assertNull(fixture.verificationStore.get(result.verificationId()));
        assertNull(fixture.pendingStore.getByEventId(event.getId()));
    }

    @Test
    void confirmRejectsWrongCodeAndKeepsPendingSession() throws IOException {
        Fixture fixture = new Fixture();
        Event event = fixture.createPendingEvent();
        String token = fixture.tokenUtil.generate(event.getId(), "cliente@example.com");
        VerificationService.StartResult result = fixture.service.start(token, "+55 31 99999-9999");
        VerificationStore.Session session = fixture.verificationStore.get(result.verificationId());
        String wrongCode = "000".equals(session.code) ? "999" : "000";

        assertThrows(BadRequestException.class, () -> fixture.service.confirm(result.verificationId(), wrongCode));

        assertNotNull(fixture.verificationStore.get(result.verificationId()));
        assertNotNull(fixture.pendingStore.getByEventId(event.getId()));
        assertEquals("PENDING_PHONE", privateProps(fixture.calendar.getEvent(event.getId())).get("status"));
    }

    private static Map<String, String> privateProps(Event event) {
        return event.getExtendedProperties().getPrivate();
    }

    private static class Fixture {
        private final DummyCalendarClient calendar = new DummyCalendarClient();
        private final TokenUtil tokenUtil = new TokenUtil("test-secret", 600);
        private final InMemoryVerificationStore verificationStore = new InMemoryVerificationStore();
        private final InMemoryPendingStore pendingStore = new InMemoryPendingStore();
        private final RecordingOtpDeliveryClient otpDeliveryClient = new RecordingOtpDeliveryClient();
        private final VerificationService service = new VerificationService(
                calendar,
                tokenUtil,
                verificationStore,
                pendingStore,
                otpDeliveryClient,
                new TestAppProperties(),
                adminAuthServiceWithoutAdmins());

        private Event createPendingEvent() throws IOException {
            ZonedDateTime start = ZonedDateTime.of(LocalDate.now(ZONE).plusDays(1), LocalTime.of(10, 0), ZONE);
            Servico servico = new Servico();
            servico.setTitle("Visita tecnica");
            servico.setDescription("Trocar tomada com defeito na sala");
            servico.setServiceNotes("Trocar tomada com defeito na sala");
            servico.setStart(start.toInstant());
            servico.setEnd(start.plusHours(1).toInstant());
            servico.setAppointmentStart(start.toInstant());
            servico.setAppointmentEnd(start.plusHours(1).toInstant());
            servico.setStatus("PENDING_PHONE");
            servico.setPendingExpiresAt(Instant.now().plus(Duration.ofMinutes(10)));
            servico.setClientFirstName("Cliente");
            servico.setClientLastName("Teste");
            servico.setClientEmail("cliente@example.com");
            servico.setClientPhone("31999999999");
            servico.setClientCep("35450000");
            servico.setClientStreet("Rua Sao Jose");
            servico.setClientNeighborhood("Centro");
            servico.setClientNumber("123");
            servico.setClientCity("Itabirito");
            servico.setClientState("MG");
            return calendar.createEvent(servico);
        }
    }

    private static AdminAuthService adminAuthServiceWithoutAdmins() {
        return new AdminAuthService(
                new NoAdminUserStore(),
                new NoopAdminSessionStore(),
                new InMemoryVerificationStore(),
                new RecordingOtpDeliveryClient(),
                new TestAppProperties());
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

        @Override
        public Duration getPendingTtl() {
            return Duration.ofMinutes(10);
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
}
