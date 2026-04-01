package br.com.calendarmate.controller;

import br.com.calendarmate.dto.RouteAdminComputeRequest;
import br.com.calendarmate.dto.RouteComputeRequest;
import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.service.RoutesService;
import br.com.calendarmate.util.AdminTokenGuard;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/routes")
public class RoutesController {

    private final RoutesService routesService;

    public RoutesController(RoutesService routesService) {
        this.routesService = routesService;
    }

    // Cliente (se você não quiser usar no front, pode manter mas não expor na UI)
    @PostMapping("/compute")
    public RouteComputeResponse compute(@Valid @RequestBody RouteComputeRequest req) throws IOException {
        return routesService.computeByToken(req.getToken(), req.getOriginLat(), req.getOriginLng());
    }

    // ADMIN: mapa/rota de QUALQUER agendamento por eventId
    @PostMapping("/admin/compute")
    public RouteComputeResponse computeAdmin(
            @RequestHeader(value = "X-ADMIN-TOKEN", required = false) String header,
            @Valid @RequestBody RouteAdminComputeRequest req
    ) throws IOException {
        AdminTokenGuard.require(header);
        return routesService.computeByEventIdAdmin(req.getEventId(), req.getOriginLat(), req.getOriginLng());
    }
}