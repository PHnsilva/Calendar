package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AddressCityContextResponse;
import br.com.calendarmate.dto.AddressSuggestionResponse;
import br.com.calendarmate.exception.DetailedBadRequestException;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.lang.reflect.Field;
import java.net.URI;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AddressAutocompleteServiceTest {
    @Test
    void returnsUnresolvedCityContextWhenGeoapifyIsNotConfigured() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "geoapifyApiKey", "");

        AddressAutocompleteService service = new AddressAutocompleteService(new RestTemplate(), props);
        AddressCityContextResponse context = service.resolveCity("Itabirito", "MG");

        assertEquals("Itabirito", context.getName());
        assertEquals("MG", context.getState());
        assertEquals("", context.getPlaceId());
        assertEquals(false, ((Map<?, ?>) context.getRaw()).get("autocompleteReady"));
    }

    @Test
    void rejectsInvalidStateWithStructuredBadRequest() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "geoapifyApiKey", "");

        AddressAutocompleteService service = new AddressAutocompleteService(new RestTemplate(), props);
        DetailedBadRequestException ex = assertThrows(
                DetailedBadRequestException.class,
                () -> service.resolveCity("Itabirito", "Minas"));

        assertEquals("ADDRESS_STATE_INVALID", ex.getCode());
        assertEquals("state", ex.getField());
    }

    @Test
    void retriesWithSelectedCityAndStateWhenShortQueryHasNoResults() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "geoapifyApiKey", "backend-test-key");
        RestTemplate http = mock(RestTemplate.class);
        List<Map<String, Object>> contextualResults = List.of(
                suggestion("moeda-1", "1"),
                suggestion("moeda-2", "2"),
                suggestion("moeda-3", "3"),
                suggestion("moeda-4", "4"),
                suggestion("moeda-5", "5")
        );
        when(http.exchange(any(URI.class), eq(HttpMethod.GET), isNull(), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("results", List.of())))
                .thenReturn(ResponseEntity.ok(Map.of("results", List.of())))
                .thenReturn(ResponseEntity.ok(Map.of("results", contextualResults)));

        AddressAutocompleteService service = new AddressAutocompleteService(http, props);
        List<AddressSuggestionResponse> results = service.search(
                "Avenida do Prateado",
                "Moeda",
                "MG",
                "moeda-place",
                -20.3331,
                -44.0525);

        ArgumentCaptor<URI> uriCaptor = ArgumentCaptor.forClass(URI.class);
        verify(http, times(3)).exchange(uriCaptor.capture(), eq(HttpMethod.GET), isNull(), eq(Map.class));
        String contextualQuery = UriComponentsBuilder.fromUri(uriCaptor.getAllValues().get(2))
                .build()
                .decode()
                .getQueryParams()
                .getFirst("text");

        assertEquals("Avenida do Prateado, Moeda, MG", contextualQuery);
        assertEquals(5, results.size());
    }

    private static Map<String, Object> suggestion(String placeId, String houseNumber) {
        return Map.of(
                "place_id", placeId,
                "formatted", "Avenida do Prateado " + houseNumber + ", Moeda - MG",
                "street", "Avenida do Prateado",
                "housenumber", houseNumber,
                "city", "Moeda",
                "state_code", "MG",
                "lat", -20.3331,
                "lon", -44.0525
        );
    }

    private static void set(Object target, String fieldName, Object value) throws Exception {
        Field field = AppProperties.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
