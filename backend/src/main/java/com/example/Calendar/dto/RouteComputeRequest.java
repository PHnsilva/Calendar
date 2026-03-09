package com.example.Calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class RouteComputeRequest {

    @NotBlank
    private String token;

    @NotNull
    private Double originLat;

    @NotNull
    private Double originLng;

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public Double getOriginLat() { return originLat; }
    public void setOriginLat(Double originLat) { this.originLat = originLat; }

    public Double getOriginLng() { return originLng; }
    public void setOriginLng(Double originLng) { this.originLng = originLng; }
}