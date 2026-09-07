package br.com.calendarmate.service;

import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.geoapify.GeoapifyRoutesClient;
import br.com.calendarmate.integrations.google.GoogleRoutesClient;
import com.google.api.services.calendar.model.Event;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.test.web.client.RequestMatcher;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.util.UriUtils;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class RoutesServiceTest {
    private static final String ROUTE_RESPONSE = """
            {"features":[{"properties":{"distance":1200,"time":180},
              "geometry":{"type":"MultiLineString","coordinates":[[[-43.81,-20.26],[-43.802,-20.253]]]}}]}
            """;

    private final RestTemplate http = new RestTemplate();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(http).build();
    private final CalendarClient calendar = mock(CalendarClient.class);
    private final GeoapifyRoutesClient geoapify = new GeoapifyRoutesClient(http, "test-key", "drive", "metric", "pt-BR", "br");
    private final RoutesService service = new RoutesService(calendar, new TokenUtil("test", 600), geoapify, true);

    @Test
    void adminRouteUsesSavedCoordinatesWithoutGeocodingTheAddressAgain() throws Exception {
        Event event = booking();
        event.getExtendedProperties().getPrivate().put("clientLatitude", "-20.253");
        event.getExtendedProperties().getPrivate().put("clientLongitude", "-43.802");
        when(calendar.getEvent("booking-1")).thenReturn(event);
        expectRouting();

        RouteComputeResponse result = service.computeByEventIdAdmin("booking-1", -20.26, -43.81);

        assertEquals(1200, result.getPrimary().getDistanceMeters());
        assertEquals(180, result.getPrimary().getDurationSeconds());
        assertFalse(result.getPrimary().getPolyline().isBlank());
        assertEquals(-43.802, result.getPrimary().getGeometry().getCoordinates().get(0).get(1).get(0));
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "NaN", "200", "invalid"})
    void legacyOrInvalidCoordinatesFallBackToStructuredAddressWithoutApartmentNotes(String latitude) throws Exception {
        Event event = booking();
        event.getExtendedProperties().getPrivate().put("clientLatitude", latitude);
        event.getExtendedProperties().getPrivate().put("clientLongitude", "-43.802");
        when(calendar.getEvent("booking-1")).thenReturn(event);
        server.expect(requestTo(startsWith("https://api.geoapify.com/v1/geocode/search?")))
                .andExpect(decodedQueryParam("text", "Rua São José, 10 - Itabirito/MG - CEP 35450000"))
                .andExpect(queryParam("filter", "countrycode:br"))
                .andRespond(withSuccess("{\"results\":[{\"lat\":-20.253,\"lon\":-43.802}]}", MediaType.APPLICATION_JSON));
        expectRouting();

        assertEquals(1200, service.computeByEventIdAdmin("booking-1", -20.26, -43.81).getPrimary().getDistanceMeters());
        server.verify();
    }

    @Test
    void coordinatesAlsoWorkWhenLegacyEventHasNoAddressText() throws Exception {
        Event event = new Event().setExtendedProperties(new Event.ExtendedProperties().setPrivate(Map.of(
                "clientLatitude", "-20.253", "clientLongitude", "-43.802")));
        when(calendar.getEvent("booking-1")).thenReturn(event);
        expectRouting();

        service.computeByEventIdAdmin("booking-1", -20.26, -43.81);

        server.verify();
    }

    @Test
    void googleRoutesUsesCoordinatesInTheDestinationWaypoint() throws Exception {
        Event event = booking();
        event.getExtendedProperties().getPrivate().put("clientLatitude", "-20.253");
        event.getExtendedProperties().getPrivate().put("clientLongitude", "-43.802");
        when(calendar.getEvent("booking-1")).thenReturn(event);
        server.expect(requestTo("https://routes.googleapis.com/directions/v2:computeRoutes"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.destination.location.latLng.latitude").value(-20.253))
                .andExpect(jsonPath("$.destination.location.latLng.longitude").value(-43.802))
                .andExpect(jsonPath("$.destination.address").doesNotExist())
                .andRespond(withSuccess("{\"routes\":[{\"distanceMeters\":1200,\"duration\":\"180s\"}]}", MediaType.APPLICATION_JSON));
        RoutesService googleService = new RoutesService(calendar, new TokenUtil("test", 600),
                new GoogleRoutesClient(http, "test-key", "", false), true);

        assertEquals(1200, googleService.computeByEventIdAdmin("booking-1", -20.26, -43.81).getPrimary().getDistanceMeters());
        server.verify();
    }

    @Test
    void invalidOriginIsRejectedBeforeCallingTheRouteProvider() throws Exception {
        when(calendar.getEvent("booking-1")).thenReturn(booking());

        assertThrows(BadRequestException.class, () -> service.computeByEventIdAdmin("booking-1", Double.NaN, -43.81));
        assertThrows(BadRequestException.class, () -> service.computeByEventIdAdmin("booking-1", -20.26, 200));
        server.verify();
    }

    private void expectRouting() {
        server.expect(requestTo(startsWith("https://api.geoapify.com/v1/routing?")))
                .andExpect(method(HttpMethod.GET))
                .andExpect(decodedQueryParam("waypoints", "-20.26,-43.81|-20.253,-43.802"))
                .andExpect(queryParam("mode", "drive"))
                .andRespond(withSuccess(ROUTE_RESPONSE, MediaType.APPLICATION_JSON));
    }

    private static RequestMatcher decodedQueryParam(String name, String expected) {
        return request -> {
            String value = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams().getFirst(name);
            assertNotNull(value);
            assertEquals(expected, UriUtils.decode(value, StandardCharsets.UTF_8));
        };
    }

    private static Event booking() {
        return new Event().setLocation("Rua São José, 10 - apartamento nos fundos, chamar no portão - Itabirito/MG")
                .setExtendedProperties(new Event.ExtendedProperties().setPrivate(new HashMap<>(Map.of(
                        "clientStreet", "Rua São José", "clientNumber", "10", "clientCity", "Itabirito",
                        "clientState", "MG", "clientCep", "35450000"))));
    }
}
