package com.example.Calendar.integrations.google;

import com.example.Calendar.dto.RouteComputeResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.integrations.routes.RouteClient;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.time.Instant;
import java.util.*;

public class GoogleRoutesClient implements RouteClient {

    private static final String ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

    private final RestTemplate http;
    private final String apiKey;
    private final String fieldMask;
    private final boolean trafficEnabled;

    public GoogleRoutesClient(RestTemplate http, String apiKey, String fieldMask, boolean trafficEnabled) {
        this.http = http;
        this.apiKey = apiKey;
        this.fieldMask = (fieldMask == null || fieldMask.isBlank())
                ? "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"
                : fieldMask.trim();
        this.trafficEnabled = trafficEnabled;
    }

    @Override
    @SuppressWarnings("unchecked")
    public java.util.List<RouteComputeResponse.RouteOption> computeRoutes(double originLat, double originLng, String destinationAddress) {
        if (destinationAddress == null || destinationAddress.isBlank()) {
            throw new BadRequestException("Destino inválido para calcular rota");
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw new BadRequestException("Google Routes API key não configurada");
        }

        Map<String, Object> body = new LinkedHashMap<>();

        body.put("origin", Map.of(
                "location", Map.of(
                        "latLng", Map.of("latitude", originLat, "longitude", originLng)
                )
        ));

        body.put("destination", Map.of(
                "address", destinationAddress
        ));

        body.put("travelMode", "DRIVE");
        body.put("computeAlternativeRoutes", true);
        body.put("languageCode", "pt-BR");
        body.put("units", "METRIC");

        if (trafficEnabled) {
            body.put("routingPreference", "TRAFFIC_AWARE_OPTIMAL");
            body.put("departureTime", Instant.now().toString());
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        headers.set("X-Goog-Api-Key", apiKey);
        headers.set("X-Goog-FieldMask", fieldMask);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(body, headers);

        ResponseEntity<Map> resp = http.exchange(ENDPOINT, HttpMethod.POST, req, Map.class);
        Map<String, Object> data = resp.getBody();
        if (data == null) throw new BadRequestException("Falha ao calcular rota");

        Object routesObj = data.get("routes");
        if (!(routesObj instanceof List<?> routes) || routes.isEmpty()) {
            throw new BadRequestException("Nenhuma rota encontrada");
        }

        List<RouteComputeResponse.RouteOption> out = new ArrayList<>();
        for (Object routeObj : routes) {
            if (!(routeObj instanceof Map<?, ?> route)) continue;

            long distance = longVal(route.get("distanceMeters"));
            Object durationObj = route.get("duration");
            long durationSeconds = parseDurationSeconds(String.valueOf(durationObj == null ? "0s" : durationObj));

            String polyline = "";
            Object polyObj = route.get("polyline");
            if (polyObj instanceof Map<?, ?> polylineMap) {
                Object enc = polylineMap.get("encodedPolyline");
                if (enc != null) polyline = String.valueOf(enc);
            }

            out.add(new RouteComputeResponse.RouteOption(distance, durationSeconds, polyline, null));
        }

        if (out.isEmpty()) {
            throw new BadRequestException("Resposta inválida da API de rotas");
        }
        return out;
    }

    private static long longVal(Object o) {
        if (o == null) return 0L;
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return 0L; }
    }

    private static long parseDurationSeconds(String iso) {
        if (iso == null) return 0L;
        String s = iso.trim().toLowerCase(Locale.ROOT);
        if (!s.endsWith("s")) return 0L;
        String num = s.substring(0, s.length() - 1);
        try { return Long.parseLong(num); } catch (Exception e) { return 0L; }
    }
}