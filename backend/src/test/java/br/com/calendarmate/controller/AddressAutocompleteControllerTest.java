package br.com.calendarmate.controller;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AddressCityContextResponse;
import br.com.calendarmate.exception.DetailedBadRequestException;
import br.com.calendarmate.exception.GlobalExceptionHandler;
import br.com.calendarmate.service.AddressAutocompleteService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AddressAutocompleteControllerTest {

    @Test
    void resolvesCityWithEnglishQueryParams() throws Exception {
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new AddressAutocompleteController(new StubAddressAutocompleteService()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(get("/api/enderecos/cidade")
                        .param("city", "Itabirito")
                        .param("state", "MG"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Itabirito"))
                .andExpect(jsonPath("$.state").value("MG"));
    }

    @Test
    void resolvesCityWithPortugueseQueryAliases() throws Exception {
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new AddressAutocompleteController(new StubAddressAutocompleteService()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(get("/api/enderecos/cidade")
                        .param("cidade", "Itabirito")
                        .param("uf", "MG"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Itabirito"))
                .andExpect(jsonPath("$.state").value("MG"));
    }

    @Test
    void returnsStructuredBadRequestForInvalidState() throws Exception {
        MockMvc mvc = MockMvcBuilders
                .standaloneSetup(new AddressAutocompleteController(new InvalidStateAddressAutocompleteService()))
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        mvc.perform(get("/api/enderecos/cidade")
                        .param("city", "Itabirito")
                        .param("state", "Minas"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("ADDRESS_STATE_INVALID"))
                .andExpect(jsonPath("$.field").value("state"))
                .andExpect(jsonPath("$.details.state").value("Minas"));
    }

    private static class StubAddressAutocompleteService extends AddressAutocompleteService {
        StubAddressAutocompleteService() {
            super(new RestTemplate(), new AppProperties());
        }

        @Override
        public AddressCityContextResponse resolveCity(String city, String state) {
            return new AddressCityContextResponse(city, state, "city-place", -20.2533, -43.8014, Map.of());
        }
    }

    private static class InvalidStateAddressAutocompleteService extends AddressAutocompleteService {
        InvalidStateAddressAutocompleteService() {
            super(new RestTemplate(), new AppProperties());
        }

        @Override
        public AddressCityContextResponse resolveCity(String city, String state) {
            throw new DetailedBadRequestException(
                    "ADDRESS_STATE_INVALID",
                    "Estado inválido. Use a UF, como MG, ou o nome completo do estado.",
                    "state",
                    Map.of("state", state));
        }
    }
}
