package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AddressCityContextResponse;
import br.com.calendarmate.exception.DetailedBadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Field;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

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

    private static void set(Object target, String fieldName, Object value) throws Exception {
        Field field = AppProperties.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
