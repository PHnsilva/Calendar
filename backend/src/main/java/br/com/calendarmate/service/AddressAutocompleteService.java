package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.AddressCityContextResponse;
import br.com.calendarmate.dto.AddressSuggestionResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.DetailedBadRequestException;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

public class AddressAutocompleteService {
    private static final String AUTOCOMPLETE_ENDPOINT = "https://api.geoapify.com/v1/geocode/autocomplete";
    private static final int DEFAULT_LIMIT = 20;
    private static final int CITY_RADIUS_METERS = 30_000;
    private static final int FALLBACK_MIN_RESULTS = 5;

    private static final Map<String, String> BRAZIL_STATE_TO_UF = Map.ofEntries(
            Map.entry("acre", "AC"),
            Map.entry("alagoas", "AL"),
            Map.entry("amapa", "AP"),
            Map.entry("amazonas", "AM"),
            Map.entry("bahia", "BA"),
            Map.entry("ceara", "CE"),
            Map.entry("distrito federal", "DF"),
            Map.entry("espirito santo", "ES"),
            Map.entry("goias", "GO"),
            Map.entry("maranhao", "MA"),
            Map.entry("mato grosso", "MT"),
            Map.entry("mato grosso do sul", "MS"),
            Map.entry("minas gerais", "MG"),
            Map.entry("para", "PA"),
            Map.entry("paraiba", "PB"),
            Map.entry("parana", "PR"),
            Map.entry("pernambuco", "PE"),
            Map.entry("piaui", "PI"),
            Map.entry("rio de janeiro", "RJ"),
            Map.entry("rio grande do norte", "RN"),
            Map.entry("rio grande do sul", "RS"),
            Map.entry("rondonia", "RO"),
            Map.entry("roraima", "RR"),
            Map.entry("santa catarina", "SC"),
            Map.entry("sao paulo", "SP"),
            Map.entry("sergipe", "SE"),
            Map.entry("tocantins", "TO")
    );

    private final RestTemplate http;
    private final AppProperties props;
    private final Map<String, AddressCityContextResponse> cityCache = new ConcurrentHashMap<>();

    public AddressAutocompleteService(RestTemplate http, AppProperties props) {
        this.http = http;
        this.props = props;
    }

    public List<AddressSuggestionResponse> search(String text, String city) {
        return search(text, city, "MG", "", null, null);
    }

    public List<AddressSuggestionResponse> search(
            String text,
            String city,
            String state,
            String cityPlaceId,
            Double cityLat,
            Double cityLon
    ) {
        String query = clean(text);
        if (query.length() < 3) return List.of();

        String normalizedState = validateAndNormalizeState(state, "state");

        String apiKey = props.getGeoapifyApiKey();
        if (apiKey.isBlank()) {
            throw new DetailedBadRequestException(
                    "ADDRESS_AUTOCOMPLETE_UNAVAILABLE",
                    "Autocomplete de endereço não está disponível nesta configuração local.",
                    "address",
                    Map.of(
                            "provider", "geoapify",
                            "autocompleteReady", false));
        }

        AddressCityContextResponse cityContext = providedCityContext(city, normalizedState, cityPlaceId, cityLat, cityLon);
        if (!hasFilterConstraint(cityContext)) {
            cityContext = resolveCity(city, normalizedState);
        }
        if (!hasFilterConstraint(cityContext)) {
            throw new DetailedBadRequestException(
                    "ADDRESS_CITY_CONTEXT_UNRESOLVED",
                    "Não foi possível validar a cidade selecionada para restringir o autocomplete.",
                    "city",
                    Map.of(
                            "city", clean(city),
                            "state", normalizedState));
        }

        try {
            List<URI> uris = buildAutocompleteUris(query, cityContext, apiKey);
            AddressCityContextResponse selectedCityContext = cityContext;
            List<AddressSuggestionResponse> collected = new ArrayList<>();

            for (URI uri : uris) {
                ResponseEntity<Map> response = http.exchange(uri, HttpMethod.GET, null, Map.class);
                Map<String, Object> body = response.getBody();
                if (body == null) continue;

                List<Map<?, ?>> rawItems = extractResults(body);
                List<AddressSuggestionResponse> normalized = rawItems.stream()
                        .map(this::toSuggestion)
                        .filter(Objects::nonNull)
                        .filter((item) -> matchesSelectedCity(item, selectedCityContext))
                        .toList();

                collected.addAll(normalized);
                int uniqueCount = dedupeSuggestions(collected).size();
                if (uris.size() <= 2 && uniqueCount > 0) {
                    break;
                }
                if (uniqueCount >= FALLBACK_MIN_RESULTS) {
                    break;
                }
            }

            return dedupeSuggestions(collected).stream().limit(DEFAULT_LIMIT).toList();
        } catch (RestClientResponseException error) {
            throw mapGeoapifyError(error);
        } catch (RestClientException error) {
            throw new BadRequestException("Nao foi possivel conectar ao autocomplete de endereco.");
        }
    }

    public AddressCityContextResponse resolveCity(String city, String state) {
        String cleanCity = clean(city);
        if (cleanCity.isBlank()) {
            throw new DetailedBadRequestException(
                    "ADDRESS_CITY_REQUIRED",
                    "Cidade é obrigatória para validar o contexto do endereço.",
                    "city",
                    Map.of("city", cleanCity));
        }
        String normalizedState = validateAndNormalizeState(state, "state");

        String apiKey = props.getGeoapifyApiKey();
        if (apiKey.isBlank()) {
            return unresolvedCityContext(cleanCity, normalizedState, "backend-geoapify-not-configured");
        }

        String cacheKey = normalizeForMatch(cleanCity) + "|" + normalizedState;
        AddressCityContextResponse cached = cityCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        URI uri = buildCityUri(cleanCity, normalizedState, apiKey);

        try {
            ResponseEntity<Map> response = http.exchange(uri, HttpMethod.GET, null, Map.class);
            Map<String, Object> body = response.getBody();
            if (body == null) {
                throw new DetailedBadRequestException(
                        "ADDRESS_CITY_NOT_FOUND",
                        "Não foi possível localizar a cidade selecionada.",
                        "city",
                        Map.of("city", cleanCity, "state", normalizedState));
            }

            AddressCityContextResponse resolved = pickMatchingCity(extractResults(body), cleanCity, normalizedState);
            if (!hasFilterConstraint(resolved)) {
                throw new DetailedBadRequestException(
                        "ADDRESS_CITY_CONTEXT_UNRESOLVED",
                        "Não foi possível validar a cidade selecionada para restringir o autocomplete.",
                        "city",
                        Map.of("city", cleanCity, "state", normalizedState));
            }

            cityCache.put(cacheKey, resolved);
            return resolved;
        } catch (RestClientResponseException error) {
            throw mapGeoapifyError(error);
        } catch (RestClientException error) {
            throw new BadRequestException("Nao foi possivel conectar ao resolvedor de cidade.");
        }
    }

    private URI buildAutocompleteUri(String query, String filter, String apiKey) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(AUTOCOMPLETE_ENDPOINT)
                .queryParam("text", query)
                .queryParam("filter", filter)
                .queryParam("limit", DEFAULT_LIMIT)
                .queryParam("lang", "pt")
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey);

        return builder.encode(StandardCharsets.UTF_8).build().toUri();
    }

    private List<URI> buildAutocompleteUris(String query, AddressCityContextResponse cityContext, String apiKey) {
        List<String> filters = new ArrayList<>();
        String placeFilter = buildPlaceFilter(cityContext);
        String circleFilter = buildCircleFilter(cityContext);
        if (!placeFilter.isBlank()) filters.add(placeFilter);
        if (!circleFilter.isBlank() && !filters.contains(circleFilter)) filters.add(circleFilter);
        if (filters.isEmpty()) filters.add(buildFilter(cityContext));

        List<URI> uris = new ArrayList<>();
        for (String variant : searchQueryVariants(query)) {
            for (String filter : filters) {
                uris.add(buildAutocompleteUri(variant, filter, apiKey));
            }
        }
        return uris;
    }

    private URI buildCityUri(String city, String state, String apiKey) {
        String statePart = clean(state);
        String text = statePart.isBlank() ? city : city + ", " + statePart;

        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(AUTOCOMPLETE_ENDPOINT)
                .queryParam("text", text)
                .queryParam("type", "city")
                .queryParam("filter", "countrycode:" + country())
                .queryParam("limit", DEFAULT_LIMIT)
                .queryParam("lang", "pt")
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey);

        return builder.encode(StandardCharsets.UTF_8).build().toUri();
    }

    private String buildFilter(AddressCityContextResponse cityContext) {
        String placeFilter = buildPlaceFilter(cityContext);
        if (!placeFilter.isBlank()) return placeFilter;
        return buildCircleFilter(cityContext);
    }

    private String buildPlaceFilter(AddressCityContextResponse cityContext) {
        String placeId = clean(cityContext == null ? "" : cityContext.getPlaceId());
        if (!placeId.isBlank()) {
            return "place:" + placeId + "|countrycode:" + country();
        }
        return "";
    }

    private String buildCircleFilter(AddressCityContextResponse cityContext) {
        if (cityContext != null
                && cityContext.getLatitude() != null
                && cityContext.getLongitude() != null
                && Double.isFinite(cityContext.getLatitude())
                && Double.isFinite(cityContext.getLongitude())) {
            return "circle:" + cityContext.getLongitude() + "," + cityContext.getLatitude() + "," + CITY_RADIUS_METERS;
        }

        return "";
    }

    private List<String> searchQueryVariants(String query) {
        List<String> variants = new ArrayList<>();
        addSearchVariant(variants, clean(query));
        addSearchVariant(variants, normalizeSearchVariant(query));
        String[] parts = clean(query).split("\\s+-\\s+");
        if (parts.length > 0) {
            addSearchVariant(variants, normalizeSearchVariant(parts[0]));
        }
        return variants;
    }

    private void addSearchVariant(List<String> variants, String value) {
        String cleanValue = clean(value).replaceAll("\\s+", " ");
        if (cleanValue.length() >= 3 && !variants.contains(cleanValue)) {
            variants.add(cleanValue);
        }
    }

    private String normalizeSearchVariant(String query) {
        return clean(query)
                .replaceFirst("(?i)^\\s*r\\.\\s+", "Rua ")
                .replaceFirst("(?i)^\\s*av\\.\\s+", "Avenida ")
                .replaceAll("\\s+-\\s+", ", ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private AddressCityContextResponse providedCityContext(
            String city,
            String state,
            String cityPlaceId,
            Double cityLat,
            Double cityLon
    ) {
        return new AddressCityContextResponse(
                clean(city),
                normalizeUf(state),
                clean(cityPlaceId),
                cityLat,
                cityLon,
                null
        );
    }

    private boolean hasFilterConstraint(AddressCityContextResponse context) {
        if (context == null) return false;
        if (!clean(context.getPlaceId()).isBlank()) return true;
        return context.getLatitude() != null
                && context.getLongitude() != null
                && Double.isFinite(context.getLatitude())
                && Double.isFinite(context.getLongitude());
    }

    private List<Map<?, ?>> extractResults(Map<String, Object> body) {
        Object resultsObj = body.get("results");
        if (resultsObj instanceof List<?> results) {
            List<Map<?, ?>> out = new ArrayList<>();
            for (Object item : results) {
                if (item instanceof Map<?, ?> map) {
                    out.add(map);
                }
            }
            return out;
        }

        Object featuresObj = body.get("features");
        if (featuresObj instanceof List<?> features) {
            List<Map<?, ?>> out = new ArrayList<>();
            for (Object item : features) {
                if (!(item instanceof Map<?, ?> feature)) {
                    continue;
                }
                Object properties = feature.get("properties");
                if (properties instanceof Map<?, ?> propertiesMap) {
                    out.add(propertiesMap);
                }
            }
            return out;
        }

        return List.of();
    }

    private AddressSuggestionResponse toSuggestion(Map<?, ?> properties) {
        String rawFormatted = firstClean(
                properties.get("formatted"),
                List.of(clean(properties.get("address_line1")), clean(properties.get("address_line2"))).stream()
                        .filter((item) -> !item.isBlank())
                        .reduce((a, b) -> a + ", " + b)
                        .orElse(""),
                List.of(
                        clean(properties.get("name")),
                        clean(properties.get("street")),
                        clean(properties.get("housenumber")),
                        clean(properties.get("suburb")),
                        clean(properties.get("city")),
                        firstClean(properties.get("state_code"), properties.get("state")),
                        clean(properties.get("country"))
                ).stream().filter((item) -> !item.isBlank()).reduce((a, b) -> a + ", " + b).orElse("")
        );
        double latitude = number(properties.get("lat"));
        double longitude = number(properties.get("lon"));

        if (rawFormatted.isBlank() || Double.isNaN(latitude) || Double.isNaN(longitude)) {
            return null;
        }

        ParsedAddressLine parsedAddressLine = parseAddressLine2(firstClean(properties.get("address_line2"), properties.get("formatted")));
        String street = firstClean(properties.get("street"), parsedAddressLine.street(), properties.get("address_line1"));
        String houseNumber = firstClean(properties.get("housenumber"), parsedAddressLine.houseNumber());
        String neighborhood = firstClean(properties.get("suburb"), properties.get("district"), properties.get("neighbourhood"), parsedAddressLine.neighborhood());
        if (isGenericPlaceResult(properties, street, neighborhood)) {
            return null;
        }
        String city = firstClean(
                properties.get("city"),
                properties.get("town"),
                properties.get("village"));
        String stateCode = normalizeUf(firstClean(properties.get("state_code"), properties.get("state")));
        String postcode = "";
        String formatted = buildDisplayLabel(street, houseNumber, neighborhood, rawFormatted);
        String id = firstClean(properties.get("place_id"), properties.get("placeId"), rawFormatted + "-" + latitude + "-" + longitude);

        return new AddressSuggestionResponse(
                id,
                formatted,
                id,
                formatted,
                latitude,
                longitude,
                buildAddressLine1(street, houseNumber, formatted),
                buildAddressLine2(neighborhood),
                street,
                houseNumber,
                neighborhood,
                city,
                stateCode,
                postcode,
                rawCopy(properties)
        );
    }

    private boolean isGenericPlaceResult(Map<?, ?> properties, String street, String neighborhood) {
        String resultType = normalizeForMatch(firstClean(
                properties.get("result_type"),
                properties.get("resultType"),
                properties.get("type")));
        if (!clean(street).isBlank()) {
            return false;
        }
        if (List.of("city", "county", "state", "postcode", "district", "suburb").contains(resultType)) {
            return true;
        }
        return clean(neighborhood).isBlank();
    }

    private AddressCityContextResponse pickMatchingCity(List<Map<?, ?>> results, String city, String state) {
        String expectedCity = normalizeForMatch(city);
        String expectedUf = normalizeUf(state);
        String expectedState = normalizeForMatch(state);

        List<AddressCityContextResponse> contexts = new ArrayList<>();
        for (Map<?, ?> result : results) {
            AddressCityContextResponse context = toCityContext(result, city, state);
            if (context != null) {
                contexts.add(context);
            }
        }

        for (AddressCityContextResponse context : contexts) {
            Map<String, Object> raw = context.getRaw() == null ? Map.of() : context.getRaw();
            List<String> cityCandidates = List.of(
                    normalizeForMatch(context.getName()),
                    normalizeForMatch(raw.get("city")),
                    normalizeForMatch(raw.get("town")),
                    normalizeForMatch(raw.get("village")),
                    normalizeForMatch(raw.get("municipality")),
                    normalizeForMatch(raw.get("name"))
            );
            boolean cityMatches = cityCandidates.stream().anyMatch(expectedCity::equals);

            List<String> ufCandidates = List.of(
                    normalizeUf(context.getState()),
                    normalizeUf(raw.get("state_code")),
                    normalizeUf(raw.get("state"))
            );
            List<String> stateCandidates = List.of(
                    normalizeForMatch(context.getState()),
                    normalizeForMatch(raw.get("state"))
            );
            boolean stateMatches = expectedUf.isBlank() && expectedState.isBlank()
                    || ufCandidates.contains(expectedUf)
                    || stateCandidates.contains(expectedState);

            if (cityMatches && stateMatches) {
                return context;
            }
        }

        return contexts.isEmpty() ? null : contexts.get(0);
    }

    private AddressCityContextResponse toCityContext(Map<?, ?> properties, String requestedCity, String requestedState) {
        String name = firstClean(
                properties.get("city"),
                properties.get("town"),
                properties.get("village"),
                properties.get("municipality"),
                properties.get("name"),
                requestedCity);
        double latitude = number(properties.get("lat"));
        double longitude = number(properties.get("lon"));

        if (name.isBlank() || Double.isNaN(latitude) || Double.isNaN(longitude)) {
            return null;
        }

        return new AddressCityContextResponse(
                name,
                firstClean(normalizeUf(firstClean(properties.get("state_code"), properties.get("state"))), normalizeUf(requestedState)),
                firstClean(properties.get("place_id"), properties.get("placeId")),
                latitude,
                longitude,
                rawCopy(properties)
        );
    }

    private boolean matchesSelectedCity(AddressSuggestionResponse item, AddressCityContextResponse context) {
        String selectedCity = normalizeForMatch(context == null ? "" : context.getName());
        if (selectedCity.isBlank()) return true;

        Map<String, Object> raw = item.getRaw() == null ? Map.of() : item.getRaw();
        List<String> cityCandidates = List.of(
                normalizeForMatch(item.getCity()),
                normalizeForMatch(raw.get("city")),
                normalizeForMatch(raw.get("town")),
                normalizeForMatch(raw.get("village"))
        ).stream().filter((value) -> !value.isBlank()).toList();

        boolean hasCityData = !cityCandidates.isEmpty();
        boolean cityMatches = cityCandidates.stream().anyMatch(selectedCity::equals);

        String selectedUf = normalizeUf(context.getState());
        List<String> ufCandidates = List.of(
                normalizeUf(item.getState()),
                normalizeUf(raw.get("state_code")),
                normalizeUf(raw.get("state")),
                normalizeUf(iso3166Uf(raw.get("iso3166_2")))
        ).stream().filter((value) -> !value.isBlank()).toList();
        boolean hasStateData = !ufCandidates.isEmpty();
        boolean stateMatches = selectedUf.isBlank() || !hasStateData || ufCandidates.contains(selectedUf);

        if (hasCityData) {
            return cityMatches && stateMatches;
        }
        return stateMatches;
    }

    private List<AddressSuggestionResponse> dedupeSuggestions(List<AddressSuggestionResponse> suggestions) {
        Map<String, AddressSuggestionResponse> unique = new LinkedHashMap<>();
        for (AddressSuggestionResponse suggestion : suggestions) {
            String key = firstClean(
                    suggestion.getPlaceId(),
                    suggestion.getId(),
                    suggestion.getLat() + ":" + suggestion.getLon() + ":" + suggestion.getLabel()
            );
            if (!key.isBlank()) {
                unique.putIfAbsent(key, suggestion);
            }
        }
        return new ArrayList<>(unique.values());
    }

    private BadRequestException mapGeoapifyError(RestClientResponseException error) {
        int status = error.getRawStatusCode();
        if (status == 401 || status == 403) {
            return new BadRequestException("Geoapify recusou a chave do autocomplete no backend. Verifique GEOAPIFY_API_KEY e restricoes do dominio/servidor.");
        }
        if (status == 429) {
            return new BadRequestException("Limite de consultas do autocomplete atingido. Tente novamente em instantes.");
        }
        return new BadRequestException("Nao foi possivel buscar sugestoes de endereco no Geoapify.");
    }

    private String buildAddressLine1(String street, String houseNumber, String fallback) {
        return List.of(street, houseNumber).stream()
                .filter((item) -> !item.isBlank())
                .reduce((a, b) -> a + ", " + b)
                .orElse(fallback);
    }

    private String buildAddressLine2(String neighborhood) {
        return neighborhood;
    }

    private String buildDisplayLabel(String street, String houseNumber, String neighborhood, String fallback) {
        return List.of(street, houseNumber, neighborhood).stream()
                .filter((item) -> !item.isBlank())
                .reduce((a, b) -> a + ", " + b)
                .orElse(fallback);
    }

    private ParsedAddressLine parseAddressLine2(Object value) {
        String[] parts = clean(value).split(",");
        int selectedIndex = 0;
        for (int index = 0; index < parts.length; index += 1) {
            if (isStreetPart(parts[index])) {
                selectedIndex = index;
                break;
            }
        }
        String firstPart = parts.length > selectedIndex ? parts[selectedIndex].trim() : "";
        String neighborhood = parts.length > selectedIndex + 1 ? parts[selectedIndex + 1].trim() : "";
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^(.+?)\\s+(\\d+[a-zA-Z]?(?:[-/]\\d+)?)$")
                .matcher(firstPart);
        if (matcher.matches()) {
            return new ParsedAddressLine(matcher.group(1).trim(), matcher.group(2).trim(), neighborhood);
        }
        if (neighborhood.matches("^\\d+[a-zA-Z]?(?:[-/]\\d+)?$")) {
            String nextNeighborhood = parts.length > selectedIndex + 2 ? parts[selectedIndex + 2].trim() : "";
            return new ParsedAddressLine(firstPart, neighborhood, nextNeighborhood);
        }
        return new ParsedAddressLine(firstPart, "", neighborhood);
    }

    private boolean isStreetPart(String value) {
        String normalized = normalizeForMatch(value);
        return normalized.matches("^(r|rua|av|avenida|alameda|travessa|praca|rodovia|estrada|beco|largo)\\b.*");
    }

    private String iso3166Uf(Object value) {
        String text = clean(value).toUpperCase(Locale.ROOT);
        return text.startsWith("BR-") && text.length() >= 5 ? text.substring(3, 5) : "";
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

    private String normalizeForMatch(Object value) {
        String text = clean(value);
        if (text.isBlank()) return "";
        String normalized = Normalizer.normalize(text, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return normalized;
    }

    private String normalizeUf(Object value) {
        String text = clean(value).toUpperCase(Locale.ROOT);
        if (text.matches("^[A-Z]{2}$")) return text;
        return BRAZIL_STATE_TO_UF.getOrDefault(normalizeForMatch(value), "");
    }

    private String validateAndNormalizeState(String state, String field) {
        String cleanState = clean(state);
        if (cleanState.isBlank()) {
            return "";
        }

        String normalized = normalizeUf(cleanState);
        if (!normalized.isBlank()) {
            return normalized;
        }

        throw new DetailedBadRequestException(
                "ADDRESS_STATE_INVALID",
                "Estado inválido. Use a UF, como MG, ou o nome completo do estado.",
                field,
                Map.of("state", cleanState));
    }

    private AddressCityContextResponse unresolvedCityContext(String city, String state, String reason) {
        return new AddressCityContextResponse(
                clean(city),
                clean(state),
                "",
                null,
                null,
                Map.of(
                        "autocompleteReady", false,
                        "reason", reason));
    }

    private double number(Object value) {
        if (value instanceof Number number) return number.doubleValue();
        try {
            return Double.parseDouble(clean(value));
        } catch (Exception error) {
            return Double.NaN;
        }
    }

    private Map<String, Object> rawCopy(Map<?, ?> source) {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : source.entrySet()) {
            if (entry.getKey() != null) {
                out.put(String.valueOf(entry.getKey()), entry.getValue());
            }
        }
        return out;
    }

    private record ParsedAddressLine(String street, String houseNumber, String neighborhood) {}
}
