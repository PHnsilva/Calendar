package br.com.calendarmate.controller;

import br.com.calendarmate.dto.RouteAdminComputeRequest;
import br.com.calendarmate.dto.RouteComputeRequest;
import br.com.calendarmate.dto.RouteComputeResponse;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.RoutesService;
import br.com.calendarmate.service.ServicoService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/routes")
public class RoutesController {

    private final RoutesService routesService;
    private final AdminAuthService adminAuthService;
    private final ServicoService servicoService;

    public RoutesController(RoutesService routesService, AdminAuthService adminAuthService, ServicoService servicoService) {
        this.routesService = routesService;
        this.adminAuthService = adminAuthService;
        this.servicoService = servicoService;
    }

    // Cliente (se você não quiser usar no front, pode manter mas não expor na UI)
    @PostMapping("/compute")
    public RouteComputeResponse compute(@Valid @RequestBody RouteComputeRequest req) throws IOException {
        return routesService.computeByToken(req.getToken(), req.getOriginLat(), req.getOriginLng());
    }

    // ADMIN: mapa/rota de QUALQUER agendamento por eventId
    @PostMapping("/admin/compute")
    public RouteComputeResponse computeAdmin(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @Valid @RequestBody RouteAdminComputeRequest req
    ) throws IOException {
        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        servicoService.requireActiveAdminAccess(req.getEventId(), principal);
        return routesService.computeByEventIdAdmin(req.getEventId(), req.getOriginLat(), req.getOriginLng());
    }
}
