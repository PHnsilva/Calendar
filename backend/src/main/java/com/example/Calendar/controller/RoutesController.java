package com.example.Calendar.controller;

import com.example.Calendar.dto.RouteComputeRequest;
import com.example.Calendar.dto.RouteComputeResponse;
import com.example.Calendar.service.RoutesService;
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

    @PostMapping("/compute")
    public RouteComputeResponse compute(@Valid @RequestBody RouteComputeRequest req) throws IOException {
        return routesService.computeByToken(req.getToken(), req.getOriginLat(), req.getOriginLng());
    }
}