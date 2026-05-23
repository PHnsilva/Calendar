package br.com.calendarmate.integrations.geoapify;

import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.integrations.routes.RouteClient;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public class GeoapifyRoutesClient implements RouteClient {

    private static final String GEOCODING_ENDPOINT = "https://api.geoapify.com/v1/geocode/search";
    private static final String ROUTING_ENDPOINT = "https://api.geoapify.com/v1/routing";

    private final RestTemplate http;
    private final String apiKey;
    private final String routingMode;
    private final String routingUnits;
    private final String routingLang;
    private final String geocodingCountry;

    public GeoapifyRoutesClient(
            RestTemplate http,
            String apiKey,
            String routingMode,
            String routingUnits,
            String routingLang,
            String geocodingCountry
    ) {
        this.http = http;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.routingMode = normalizeOrDefault(routingMode, "drive");
        this.routingUnits = normalizeOrDefault(routingUnits, "metric");
        this.routingLang = normalizeOrDefault(routingLang, "pt-BR");
        this.geocodingCountry = geocodingCountry == null ? "" : geocodingCountry.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public List<RouteComputeResponse.RouteOption> computeRoutes(double originLat, double originLng, String destinationAddress) {
        validateInput(destinationAddress);

        double[] destination = geocodeDestination(destinationAddress);
        URI routingUri = UriComponentsBuilder.fromHttpUrl(ROUTING_ENDPOINT)
                .queryParam("waypoints", formatWaypoint(originLat, originLng) + "|" + formatWaypoint(destination[0], destination[1]))
                .queryParam("mode", routingMode)
                .queryParam("units", routingUnits)
                .queryParam("lang", routingLang)
                .queryParam("format", "geojson")
                .queryParam("apiKey", apiKey)
                .encode(StandardCharsets.UTF_8)
                .build()
                .toUri();

        ResponseEntity<Map> resp = http.exchange(routingUri, HttpMethod.GET, null, Map.class);
        Map<String, Object> body = resp.getBody();
        if (body == null) {
            throw new BadRequestException("Falha ao calcular rota no Geoapify");
        }
        return mapRoutes(body);
    }

    private void validateInput(String destinationAddress) {
        if (destinationAddress == null || destinationAddress.isBlank()) {
            throw new BadRequestException("Destino inválido para calcular rota");
        }
        if (apiKey.isBlank()) {
            throw new BadRequestException("Geoapify API key não configurada");
        }
    }

    private double[] geocodeDestination(String destinationAddress) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(GEOCODING_ENDPOINT)
                .queryParam("text", destinationAddress)
                .queryParam("format", "json")
                .queryParam("apiKey", apiKey);

        if (!geocodingCountry.isBlank()) {
            builder.queryParam("filter", "countrycode:" + geocodingCountry);
        }

        URI geocodeUri = builder.encode(StandardCharsets.UTF_8).build().toUri();
        ResponseEntity<Map> resp = http.exchange(geocodeUri, HttpMethod.GET, null, Map.class);
        Map<String, Object> body = resp.getBody();
        if (body == null) {
            throw new BadRequestException("Falha ao geocodificar destino no Geoapify");
        }

        Object resultsObj = body.get("results");
        if (!(resultsObj instanceof List<?> results) || results.isEmpty()) {
            throw new BadRequestException("Endereço do agendamento não pôde ser localizado para cálculo de rota");
        }

        Object firstObj = results.get(0);
        if (!(firstObj instanceof Map<?, ?> first)) {
            throw new BadRequestException("Resposta inválida da geocodificação do Geoapify");
        }

        double lat = doubleVal(first.get("lat"));
        double lon = doubleVal(first.get("lon"));
        if (lat == 0d && lon == 0d) {
            throw new BadRequestException("Geocodificação do destino retornou coordenadas inválidas");
        }
        return new double[]{lat, lon};
    }

    @SuppressWarnings("unchecked")
    private List<RouteComputeResponse.RouteOption> mapRoutes(Map<String, Object> body) {
        Object featuresObj = body.get("features");
        if (!(featuresObj instanceof List<?> features) || features.isEmpty()) {
            throw new BadRequestException("Nenhuma rota encontrada");
        }

        List<RouteComputeResponse.RouteOption> out = new ArrayList<>();
        for (Object featureObj : features) {
            if (!(featureObj instanceof Map<?, ?> feature)) continue;
            Object propertiesObj = feature.get("properties");
            Object geometryObj = feature.get("geometry");
            if (!(propertiesObj instanceof Map<?, ?> properties) || !(geometryObj instanceof Map<?, ?> geometryMap)) {
                continue;
            }

            long distance = Math.round(doubleVal(properties.get("distance")));
            long duration = Math.round(doubleVal(properties.get("time")));
            RouteComputeResponse.RouteGeometry geometry = toGeometry(geometryMap);
            String polyline = encodePolyline(geometry);
            out.add(new RouteComputeResponse.RouteOption(distance, duration, polyline, geometry));
        }

        if (out.isEmpty()) {
            throw new BadRequestException("Resposta inválida da API de rotas");
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    private RouteComputeResponse.RouteGeometry toGeometry(Map<?, ?> geometryMap) {
        Object typeObj = geometryMap.get("type");
        String type = String.valueOf(typeObj == null ? "MultiLineString" : typeObj);
        Object coordsObj = geometryMap.get("coordinates");
        if (!(coordsObj instanceof List<?> outer)) {
            throw new BadRequestException("Geometria inválida da rota");
        }

        List<List<List<Double>>> coordinates = new ArrayList<>();
        if (!outer.isEmpty() && outer.get(0) instanceof List<?> firstLine && !firstLine.isEmpty() && firstLine.get(0) instanceof Number) {
            List<List<Double>> singleLine = new ArrayList<>();
            for (Object pointObj : outer) {
                if (!(pointObj instanceof List<?> point) || point.size() < 2) continue;
                singleLine.add(List.of(doubleVal(point.get(0)), doubleVal(point.get(1))));
            }
            if (!singleLine.isEmpty()) {
                coordinates.add(singleLine);
            }
        } else {
            for (Object lineObj : outer) {
                if (!(lineObj instanceof List<?> line)) continue;
                List<List<Double>> normalizedLine = new ArrayList<>();
                for (Object pointObj : line) {
                    if (!(pointObj instanceof List<?> point) || point.size() < 2) continue;
                    normalizedLine.add(List.of(doubleVal(point.get(0)), doubleVal(point.get(1))));
                }
                if (!normalizedLine.isEmpty()) {
                    coordinates.add(normalizedLine);
                }
            }
        }

        if (coordinates.isEmpty()) {
            throw new BadRequestException("Coordenadas inválidas da rota");
        }
        return new RouteComputeResponse.RouteGeometry(type, coordinates);
    }

    private String encodePolyline(RouteComputeResponse.RouteGeometry geometry) {
        if (geometry == null || geometry.getCoordinates() == null) return "";

        StringBuilder encoded = new StringBuilder();
        long previousLat = 0L;
        long previousLon = 0L;
        boolean first = true;

        for (List<List<Double>> line : geometry.getCoordinates()) {
            for (List<Double> point : line) {
                if (point.size() < 2) continue;
                long lon = Math.round(point.get(0) * 1e5);
                long lat = Math.round(point.get(1) * 1e5);

                if (first) {
                    encodeValue(encoded, lat);
                    encodeValue(encoded, lon);
                    first = false;
                } else {
                    encodeValue(encoded, lat - previousLat);
                    encodeValue(encoded, lon - previousLon);
                }
                previousLat = lat;
                previousLon = lon;
            }
        }
        return encoded.toString();
    }

    private void encodeValue(StringBuilder out, long value) {
        long v = value < 0 ? ~(value << 1) : value << 1;
        while (v >= 0x20) {
            out.append((char) ((0x20 | (v & 0x1f)) + 63));
            v >>= 5;
        }
        out.append((char) (v + 63));
    }

    private String formatWaypoint(double lat, double lon) {
        return lat + "," + lon;
    }

    private String normalizeOrDefault(String raw, String fallback) {
        String value = raw == null ? "" : raw.trim();
        return value.isBlank() ? fallback : value;
    }

    private static double doubleVal(Object value) {
        if (value == null) return 0d;
        try {
            return Double.parseDouble(String.valueOf(value));
        } catch (Exception e) {
            return 0d;
        }
    }
}
