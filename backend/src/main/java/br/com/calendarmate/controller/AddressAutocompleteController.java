package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AddressCityContextResponse;
import br.com.calendarmate.dto.AddressSuggestionResponse;
import br.com.calendarmate.service.AddressAutocompleteService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/enderecos")
public class AddressAutocompleteController {

    private final AddressAutocompleteService addressAutocompleteService;

    public AddressAutocompleteController(AddressAutocompleteService addressAutocompleteService) {
        this.addressAutocompleteService = addressAutocompleteService;
    }

    @GetMapping("/autocomplete")
    public List<AddressSuggestionResponse> autocomplete(
            @RequestParam String text,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String cidade,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String uf,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false, defaultValue = "") String cityPlaceId,
            @RequestParam(required = false) Double cityLat,
            @RequestParam(required = false) Double cityLon
    ) {
        return addressAutocompleteService.search(
                text,
                firstNonBlank(city, cidade),
                firstNonBlank(state, uf, estado, "MG"),
                cityPlaceId,
                cityLat,
                cityLon);
    }

    @GetMapping("/cidade")
    public AddressCityContextResponse resolveCity(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String cidade,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String uf,
            @RequestParam(required = false) String estado
    ) {
        return addressAutocompleteService.resolveCity(
                firstNonBlank(city, cidade),
                firstNonBlank(state, uf, estado, "MG"));
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.trim().isBlank()) {
                return value.trim();
            }
        }
        return "";
    }
}
