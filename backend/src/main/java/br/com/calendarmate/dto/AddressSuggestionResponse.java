package br.com.calendarmate.dto;

public class AddressSuggestionResponse {
    private String id;
    private String label;
    private String placeId;
    private String formatted;
    private double latitude;
    private double longitude;
    private double lat;
    private double lon;
    private String addressLine1;
    private String addressLine2;
    private String street;
    private String houseNumber;
    private String neighborhood;
    private String city;
    private String state;
    private String postcode;
    private java.util.Map<String, Object> raw;

    public AddressSuggestionResponse() {}

    public AddressSuggestionResponse(
            String placeId,
            String formatted,
            double latitude,
            double longitude,
            String addressLine1,
            String addressLine2,
            String street,
            String houseNumber,
            String neighborhood,
            String city,
            String state,
            String postcode
    ) {
        this(
                placeId,
                formatted,
                placeId,
                formatted,
                latitude,
                longitude,
                addressLine1,
                addressLine2,
                street,
                houseNumber,
                neighborhood,
                city,
                state,
                postcode,
                null
        );
    }

    public AddressSuggestionResponse(
            String id,
            String label,
            String placeId,
            String formatted,
            double latitude,
            double longitude,
            String addressLine1,
            String addressLine2,
            String street,
            String houseNumber,
            String neighborhood,
            String city,
            String state,
            String postcode,
            java.util.Map<String, Object> raw
    ) {
        this.id = id;
        this.label = label;
        this.placeId = placeId;
        this.formatted = formatted;
        this.latitude = latitude;
        this.longitude = longitude;
        this.lat = latitude;
        this.lon = longitude;
        this.addressLine1 = addressLine1;
        this.addressLine2 = addressLine2;
        this.street = street;
        this.houseNumber = houseNumber;
        this.neighborhood = neighborhood;
        this.city = city;
        this.state = state;
        this.postcode = postcode;
        this.raw = raw;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }

    public String getFormatted() { return formatted; }
    public void setFormatted(String formatted) { this.formatted = formatted; }

    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) {
        this.latitude = latitude;
        this.lat = latitude;
    }

    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) {
        this.longitude = longitude;
        this.lon = longitude;
    }

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLon() { return lon; }
    public void setLon(double lon) { this.lon = lon; }

    public String getAddressLine1() { return addressLine1; }
    public void setAddressLine1(String addressLine1) { this.addressLine1 = addressLine1; }

    public String getAddressLine2() { return addressLine2; }
    public void setAddressLine2(String addressLine2) { this.addressLine2 = addressLine2; }

    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }

    public String getHouseNumber() { return houseNumber; }
    public void setHouseNumber(String houseNumber) { this.houseNumber = houseNumber; }

    public String getNeighborhood() { return neighborhood; }
    public void setNeighborhood(String neighborhood) { this.neighborhood = neighborhood; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPostcode() { return postcode; }
    public void setPostcode(String postcode) { this.postcode = postcode; }

    public java.util.Map<String, Object> getRaw() { return raw; }
    public void setRaw(java.util.Map<String, Object> raw) { this.raw = raw; }
}
