package br.com.calendarmate.google;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.zip.GZIPInputStream;

import static org.junit.jupiter.api.Assertions.*;

class GoogleCalendarCancellationTransportTest {
    private static final String EXISTING_EVENT = """
            {
              "id": "booking-1", "status": "confirmed", "summary": "Tomada (Confirmado)",
              "description": "Observações preservadas", "location": "Rua Um, 123",
              "start": {"dateTime": "2026-09-20T09:00:00-03:00", "timeZone": "America/Sao_Paulo"},
              "end": {"dateTime": "2026-09-20T10:00:00-03:00", "timeZone": "America/Sao_Paulo"},
              "attendees": [{"email": "client@example.test", "responseStatus": "accepted"}],
              "extendedProperties": {
                "private": {"appSource": "calendar-backend", "entityType": "booking",
                            "status": "CONFIRMED", "serviceType": "Tomada", "clientPhone": "31999999999"},
                "shared": {"externalReference": "preserved"}
              },
              "transparency": "opaque"
            }
            """;

    @ParameterizedTest
    @ValueSource(strings = {"CUSTOMER_PHONE_LOOKUP", "CUSTOMER_MANAGE_TOKEN", "ADMIN"})
    void cancelsThroughProductionHttpTransportWithoutLosingEventData(String source) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        List<String> methods = new ArrayList<>();
        AtomicReference<String> updateBody = new AtomicReference<>();
        server.createContext("/calendar/v3/calendars/primary/events/booking-1", exchange -> {
            methods.add(exchange.getRequestMethod());
            String response = EXISTING_EVENT;
            if (!"GET".equals(exchange.getRequestMethod())) {
                var body = exchange.getRequestBody();
                if ("gzip".equalsIgnoreCase(exchange.getRequestHeaders().getFirst("Content-Encoding"))) {
                    body = new GZIPInputStream(body);
                }
                response = new String(body.readAllBytes(), StandardCharsets.UTF_8);
                updateBody.set(response);
            }
            byte[] bytes = response.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
            exchange.sendResponseHeaders(200, bytes.length);
            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        });
        server.start();
        try {
            var json = JacksonFactory.getDefaultInstance();
            Calendar api = new Calendar.Builder(new NetHttpTransport(), json, request -> {
                request.setConnectTimeout(2000);
                request.setReadTimeout(2000);
            }).setRootUrl("http://127.0.0.1:" + server.getAddress().getPort() + "/")
                    .setApplicationName("cancellation-test").build();
            GoogleCalendarClient client = new GoogleCalendarClient(api, "primary");
            Instant cancelledAt = Instant.parse("2026-09-07T12:00:00Z");

            Event result = client.cancelEvent("booking-1", cancelledAt, source);

            assertEquals(List.of("GET", "PUT"), methods);
            Event sent = json.fromString(updateBody.get(), Event.class);
            Event original = json.fromString(EXISTING_EVENT, Event.class);
            assertEquals("CANCELLED", result.getExtendedProperties().getPrivate().get("status"));
            assertEquals(source, sent.getExtendedProperties().getPrivate().get("cancellationSource"));
            assertEquals(cancelledAt.toString(), sent.getExtendedProperties().getPrivate().get("cancellationAt"));
            assertEquals("Tomada (Cancelado)", sent.getSummary());
            assertEquals("transparent", sent.getTransparency());
            assertEquals(original.getStatus(), sent.getStatus());
            assertEquals(original.getStart(), sent.getStart());
            assertEquals(original.getEnd(), sent.getEnd());
            assertEquals(original.getAttendees(), sent.getAttendees());
            assertEquals(original.getDescription(), sent.getDescription());
            assertEquals(original.getLocation(), sent.getLocation());
            assertEquals(original.getExtendedProperties().getShared(), sent.getExtendedProperties().getShared());
        } finally {
            server.stop(0);
        }
    }
}
