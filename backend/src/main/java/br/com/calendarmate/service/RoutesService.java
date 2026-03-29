package br.com.calendarmate.service;

import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.google.GoogleRoutesClient;
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.util.*;

public class RoutesService {

    private final CalendarClient calendarClient;
    private final TokenUtil tokenUtil;
    private final GoogleRoutesClient routesClient;
    private final boolean enabled;

    public RoutesService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            GoogleRoutesClient routesClient,
            boolean enabled
    ) {
        this.calendarClient = calendarClient;
        this.tokenUtil = tokenUtil;
        this.routesClient = routesClient;
        this.enabled = enabled;
    }

    public RouteComputeResponse computeByToken(String token, double originLat, double originLng) throws IOException {
        if (!enabled) throw new ForbiddenException("Rotas desabilitadas");

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) throw new ForbiddenException("Token inválido ou expirado");

        Event ev = calendarClient.getEvent(vt.getEventId());
        if (ev == null) throw new BadRequestException("Agendamento não encontrado");

        String destination = extractDestinationAddress(ev);
        Map<String, Object> api = routesClient.computeRoutes(originLat, originLng, destination);
        return mapToResponse(api);
    }

    // ✅ NOVO: admin calcula rota por eventId (sem token do cliente)
    public RouteComputeResponse computeByEventIdAdmin(String eventId, double originLat, double originLng) throws IOException {
        if (!enabled) throw new ForbiddenException("Rotas desabilitadas");
        if (eventId == null || eventId.isBlank()) throw new BadRequestException("eventId é obrigatório");

        Event ev = calendarClient.getEvent(eventId);
        if (ev == null) throw new BadRequestException("Agendamento não encontrado");

        String destination = extractDestinationAddress(ev);
        Map<String, Object> api = routesClient.computeRoutes(originLat, originLng, destination);
        return mapToResponse(api);
    }

    private String extractDestinationAddress(Event ev) {
        String loc = ev.getLocation();
        if (loc != null && !loc.isBlank()) return loc.trim();

        Map<String, String> ext = privateExt(ev);
        String street = ext.getOrDefault("clientStreet", "");
        String num = ext.getOrDefault("clientNumber", "");
        String city = ext.getOrDefault("clientCity", "");
        String state = ext.getOrDefault("clientState", "");
        String cep = ext.getOrDefault("clientCep", "");

        String dest = (street + ", " + num + " - " + city + " " + state + " CEP " + cep).trim();
        if (dest.replace(",", "").replace("-", "").isBlank()) {
            throw new BadRequestException("Destino sem endereço para calcular rota");
        }
        return dest;
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    @SuppressWarnings("unchecked")
    private RouteComputeResponse mapToResponse(Map<String, Object> api) {
        Object routesObj = api.get("routes");
        if (!(routesObj instanceof List)) throw new BadRequestException("Resposta inválida da API de rotas");

        List<Object> routes = (List<Object>) routesObj;
        if (routes.isEmpty()) throw new BadRequestException("Nenhuma rota encontrada");

        RouteComputeResponse out = new RouteComputeResponse();
        out.setPrimary(toOption(routes.get(0)));

        if (routes.size() > 1) out.setAlternative(toOption(routes.get(1)));
        return out;
    }

    @SuppressWarnings("unchecked")
    private RouteComputeResponse.RouteOption toOption(Object routeObj) {
        if (!(routeObj instanceof Map)) throw new BadRequestException("Resposta inválida da API de rotas");
        Map<String, Object> r = (Map<String, Object>) routeObj;

        long distance = longVal(r.get("distanceMeters"));
        long durationSeconds = parseDurationSeconds(String.valueOf(r.getOrDefault("duration", "0s")));

        String polyline = "";
        Object polyObj = r.get("polyline");
        if (polyObj instanceof Map) {
            Object enc = ((Map<?, ?>) polyObj).get("encodedPolyline");
            if (enc != null) polyline = String.valueOf(enc);
        }

        return new RouteComputeResponse.RouteOption(distance, durationSeconds, polyline);
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