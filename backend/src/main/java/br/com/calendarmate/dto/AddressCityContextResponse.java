package br.com.calendarmate.dto;

import java.util.Map;

public class AddressCityContextResponse {
    private String name;
    private String state;
    private String placeId;
    private Double latitude;
    private Double longitude;
    private Map<String, Object> raw;

    public AddressCityContextResponse() {}

    public AddressCityContextResponse(
            String name,
            String state,
            String placeId,
            Double latitude,
            Double longitude,
            Map<String, Object> raw
    ) {
        this.name = name;
        this.state = state;
        this.placeId = placeId;
        this.latitude = latitude;
        this.longitude = longitude;
        this.raw = raw;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }

    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    public Map<String, Object> getRaw() { return raw; }
    public void setRaw(Map<String, Object> raw) { this.raw = raw; }
}
