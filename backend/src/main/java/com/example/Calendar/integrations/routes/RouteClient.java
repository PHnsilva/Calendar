package com.example.Calendar.integrations.routes;

import com.example.Calendar.dto.RouteComputeResponse;

import java.util.List;

public interface RouteClient {

    List<RouteComputeResponse.RouteOption> computeRoutes(double originLat, double originLng, String destinationAddress);
}
