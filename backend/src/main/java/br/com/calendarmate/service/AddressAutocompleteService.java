package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AddressSuggestionResponse;
import br.com.calendarmate.exception.BadRequestException;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

public class AddressAutocompleteService {
    private static final String AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
    private static final int DEFAULT_LIMIT = 5;

    private final RestTemplate http;
    private final AppProperties props;

    public AddressAutocompleteService(RestTemplate http, AppProperties props) {
        this.http = http;
        this.props = props;
    }

    public List<AddressSuggestionResponse> search(String text, String city) {
        String query = clean(text);
        if (query.length() < 3) return List.of();

        String apiKey = props.getGeoapifyApiKey();
        if (apiKey.isBlank()) {
            throw new BadRequestException("Autocomplete de endereco nao configurado no backend.");
        }

        URI uri = buildUri(query, city, apiKey);

        try {
            ResponseEntity<Map> response = http.exchange(uri, HttpMethod.GET, null, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null) return List.of();

            Object resultsObj = body.get("results");
            if (!(resultsObj instanceof List<?> results)) return List.of();

            return results.stream()
                    .filter(Map.class::isInstance)
                    .map((item) -> toSuggestion((Map<?, ?>) item))
                    .filter(Objects::nonNull)
                    .limit(DEFAULT_LIMIT)
                    .toList();
        } catch (RestClientResponseException error) {
            int status = error.getRawStatusCode();
            if (status == 401 || status == 403) {
                throw new BadRequestException("Geoapify recusou a chave do autocomplete no backend. Verifique GEOAPIFY_API_KEY e restricoes do dominio/servidor.");
            }
            if (status == 429) {
                throw new BadRequestException("Limite de consultas do autocomplete atingido. Tente novamente em instantes.");
            }
            throw new BadRequestException("Nao foi possivel buscar sugestoes de endereco no Geoapify.");
        } catch (RestClientException error) {
            throw new BadRequestException("Nao foi possivel conectar ao autocomplete de endereco.");
        }
    }

    private URI buildUri(String query, String city, String apiKey) {
        String cleanCity = clean(city);
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(AUTOCOMPLETE_ENDPOINT)
                .queryParam("text", cleanCity.isBlank() ? query : query + ", " + cleanCity)
                .queryParam("filter", "countrycode:" + country())
                .queryParam("limit", DEFAULT_LIMIT)
                .queryParam("lang", "pt")
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey);

        return builder.encode(StandardCharsets.UTF_8).build().toUri();
    }

    private AddressSuggestionResponse toSuggestion(Map<?, ?> properties) {
        String formatted = clean(properties.get("formatted"));
        double latitude = number(properties.get("lat"));
        double longitude = number(properties.get("lon"));

        if (formatted.isBlank() || Double.isNaN(latitude) || Double.isNaN(longitude)) {
            return null;
        }

        String street = firstClean(properties.get("street"), properties.get("address_line1"));
        String houseNumber = clean(properties.get("housenumber"));
        String neighborhood = firstClean(properties.get("suburb"), properties.get("district"), properties.get("neighbourhood"));
        String city = firstClean(properties.get("city"), properties.get("county"), properties.get("state_district"));
        String stateCode = firstClean(properties.get("state_code"), properties.get("state")).toUpperCase(Locale.ROOT);
        String postcode = clean(properties.get("postcode")).replaceAll("\\D", "");
        if (postcode.length() > 8) postcode = postcode.substring(0, 8);

        return new AddressSuggestionResponse(
                firstClean(properties.get("place_id"), properties.get("result_type"), formatted),
                formatted,
                latitude,
                longitude,
                buildAddressLine1(street, houseNumber, formatted),
                buildAddressLine2(neighborhood, city, stateCode),
                street,
                houseNumber,
                neighborhood,
                city,
                stateCode,
                postcode
        );
    }

    private String buildAddressLine1(String street, String houseNumber, String fallback) {
        return List.of(street, houseNumber).stream()
                .filter((item) -> !item.isBlank())
                .reduce((a, b) -> a + ", " + b)
                .orElse(fallback);
    }

    private String buildAddressLine2(String neighborhood, String city, String state) {
        return List.of(neighborhood, city, state).stream()
                .filter((item) -> !item.isBlank())
                .reduce((a, b) -> a + " - " + b)
                .orElse("");
    }

    private String country() {
        String country = props.getGeoapifyGeocodingCountry();
        return country.isBlank() ? "br" : country.toLowerCase(Locale.ROOT);
    }

    private String firstClean(Object... values) {
        for (Object value : values) {
            String text = clean(value);
            if (!text.isBlank()) return text;
        }
        return "";
    }

    private String clean(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private double number(Object value) {
        if (value instanceof Number number) return number.doubleValue();
        try {
            return Double.parseDouble(clean(value));
        } catch (Exception error) {
            return Double.NaN;
        }
    }
}
