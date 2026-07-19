package br.com.calendarmate.service;

import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.routes.RouteClient;
import com.google.api.services.calendar.model.Event;

import java.io.IOException;
import java.util.Collections;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RoutesService {

    private final CalendarClient calendarClient;
    private final TokenUtil tokenUtil;
    private final RouteClient routeClient;
    private final boolean enabled;

    public RoutesService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            RouteClient routeClient,
            boolean enabled
    ) {
        this.calendarClient = calendarClient;
        this.tokenUtil = tokenUtil;
        this.routeClient = routeClient;
        this.enabled = enabled;
    }

    public RouteComputeResponse computeByToken(String token, double originLat, double originLng) throws IOException {
        if (!enabled) throw new ForbiddenException("Rotas desabilitadas");

        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) throw new ForbiddenException("Token inválido ou expirado");

        Event ev = calendarClient.getEvent(vt.getEventId());
        if (ev == null) throw new BadRequestException("Agendamento não encontrado");

        return computeFromEvent(ev, originLat, originLng);
    }

    public RouteComputeResponse computeByEventIdAdmin(String eventId, double originLat, double originLng) throws IOException {
        if (!enabled) throw new ForbiddenException("Rotas desabilitadas");
        if (eventId == null || eventId.isBlank()) throw new BadRequestException("eventId é obrigatório");

        Event ev = calendarClient.getEvent(eventId);
        if (ev == null) throw new BadRequestException("Agendamento não encontrado");

        return computeFromEvent(ev, originLat, originLng);
    }

    private RouteComputeResponse computeFromEvent(Event event, double originLat, double originLng) {
        String destination = extractDestinationAddress(event);
        List<RouteComputeResponse.RouteOption> options = routeClient.computeRoutes(originLat, originLng, destination);
        if (options.isEmpty()) {
            throw new BadRequestException("Nenhuma rota encontrada");
        }

        RouteComputeResponse out = new RouteComputeResponse();
        out.setPrimary(options.get(0));
        if (options.size() > 1) {
            out.setAlternative(options.get(1));
        }
        return out;
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

        List<String> parts = new ArrayList<>();
        if (!street.isBlank() || !num.isBlank()) {
            parts.add((street + (street.isBlank() || num.isBlank() ? "" : ", ") + num).trim());
        }
        if (!city.isBlank() || !state.isBlank()) {
            parts.add((city + (city.isBlank() || state.isBlank() ? "" : "/") + state).trim());
        }
        if (!cep.isBlank()) {
            parts.add("CEP " + cep);
        }
        String dest = String.join(" - ", parts);
        if (dest.isBlank()) {
            throw new BadRequestException("Destino sem endereço para calcular rota");
        }
        return dest;
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null) return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null) return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }
}
