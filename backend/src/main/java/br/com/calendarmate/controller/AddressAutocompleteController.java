package br.com.calendarmate.controller;

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
            @RequestParam(required = false, defaultValue = "") String city
    ) {
        return addressAutocompleteService.search(text, city);
    }
}
