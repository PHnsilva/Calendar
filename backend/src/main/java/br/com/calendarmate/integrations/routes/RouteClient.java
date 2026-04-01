package br.com.calendarmate.integrations.routes;

import br.com.calendarmate.dto.RouteComputeResponse;

import java.util.List;

public interface RouteClient {

    List<RouteComputeResponse.RouteOption> computeRoutes(double originLat, double originLng, String destinationAddress);
}
