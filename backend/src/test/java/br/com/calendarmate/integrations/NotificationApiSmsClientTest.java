package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class NotificationApiSmsClientTest {

    @TempDir
    Path tempDir;

    private HttpServer server;

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void usesConfiguredSendEndpointWithoutAppendingDuplicatePathAndSendsE164Phone() throws Exception {
        AtomicReference<String> requestedPath = new AtomicReference<>("");
        AtomicReference<String> requestBody = new AtomicReference<>("");
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/send", exchange -> {
            requestedPath.set(exchange.getRequestURI().getPath());
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            respond(exchange, 200, "{\"trackingId\":\"trk_test\",\"messages\":[\"ok\"]}");
        });
        server.start();

        NotificationApiSmsClient client = new NotificationApiSmsClient(
                "test-api-key",
                "http://localhost:" + server.getAddress().getPort() + "/send",
                "calendar_mate_otp",
                new MonthlySmsQuota(10, tempDir.resolve("sms-usage.properties").toString()),
                "calendar-mate.vercel.app");

        client.sendCode("+55 (11) 98765-4321", "123");

        assertEquals("/send", requestedPath.get());
        assertTrue(requestBody.get().contains("\"number\": \"+5511987654321\""));
    }

    @Test
    void rejectsInvalidPhoneBeforeCallingProvider() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/send", exchange -> {
            calls.incrementAndGet();
            respond(exchange, 200, "{\"trackingId\":\"trk_test\",\"messages\":[\"ok\"]}");
        });
        server.start();

        NotificationApiSmsClient client = new NotificationApiSmsClient(
                "test-api-key",
                "http://localhost:" + server.getAddress().getPort(),
                "calendar_mate_otp",
                new MonthlySmsQuota(10, tempDir.resolve("sms-usage.properties").toString()),
                "calendar-mate.vercel.app");

        assertThrows(BadRequestException.class, () -> client.sendCode("+1 11987654321", "123"));
        assertEquals(0, calls.get());
    }

    @Test
    void mapsProviderAuthFailureToSafeErrorCode() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/send", exchange -> respond(exchange, 401, "{\"error\":\"unauthorized\"}"));
        server.start();

        NotificationApiSmsClient client = new NotificationApiSmsClient(
                "test-api-key",
                "http://localhost:" + server.getAddress().getPort(),
                "calendar_mate_otp",
                new MonthlySmsQuota(10, tempDir.resolve("sms-usage.properties").toString()),
                "calendar-mate.vercel.app");

        ExternalServiceException ex = assertThrows(ExternalServiceException.class, () -> client.sendCode("11987654321", "123"));
        assertEquals("PROVIDER_AUTH_FAILED", ex.getErrorCode());
        assertEquals(401, ex.getProviderStatus());
    }

    @Test
    void mapsProviderBadRequestToSafeErrorCode() throws Exception {
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/send", exchange -> respond(exchange, 400, "{\"error\":\"bad request\"}"));
        server.start();

        NotificationApiSmsClient client = new NotificationApiSmsClient(
                "test-api-key",
                "http://localhost:" + server.getAddress().getPort(),
                "calendar_mate_otp",
                new MonthlySmsQuota(10, tempDir.resolve("sms-usage.properties").toString()),
                "calendar-mate.vercel.app");

        ExternalServiceException ex = assertThrows(ExternalServiceException.class, () -> client.sendCode("11987654321", "123"));
        assertEquals("PROVIDER_REJECTED_REQUEST", ex.getErrorCode());
        assertEquals(400, ex.getProviderStatus());
    }

    @Test
    void reportsMissingApiKeyBeforeCallingProvider() throws Exception {
        AtomicInteger calls = new AtomicInteger();
        server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/send", exchange -> {
            calls.incrementAndGet();
            respond(exchange, 200, "{\"trackingId\":\"trk_test\",\"messages\":[\"ok\"]}");
        });
        server.start();

        NotificationApiSmsClient client = new NotificationApiSmsClient(
                "",
                "http://localhost:" + server.getAddress().getPort(),
                "calendar_mate_otp",
                new MonthlySmsQuota(10, tempDir.resolve("sms-usage.properties").toString()),
                "calendar-mate.vercel.app");

        ExternalServiceException ex = assertThrows(ExternalServiceException.class, () -> client.sendCode("11987654321", "123"));
        assertEquals("PROVIDER_CONFIG_MISSING", ex.getErrorCode());
        assertEquals(0, calls.get());
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
