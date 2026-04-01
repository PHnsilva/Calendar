package br.com.calendarmate.dto;

import java.util.List;

public class RouteComputeResponse {

    public static class RouteGeometry {
        private String type;
        private List<List<List<Double>>> coordinates;

        public RouteGeometry() {}

        public RouteGeometry(String type, List<List<List<Double>>> coordinates) {
            this.type = type;
            this.coordinates = coordinates;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public List<List<List<Double>>> getCoordinates() { return coordinates; }
        public void setCoordinates(List<List<List<Double>>> coordinates) { this.coordinates = coordinates; }
    }

    public static class RouteOption {
        private long distanceMeters;
        private long durationSeconds;
        private String polyline;
        private RouteGeometry geometry;

        public RouteOption() {}

        public RouteOption(long distanceMeters, long durationSeconds, String polyline, RouteGeometry geometry) {
            this.distanceMeters = distanceMeters;
            this.durationSeconds = durationSeconds;
            this.polyline = polyline;
            this.geometry = geometry;
        }

        public long getDistanceMeters() { return distanceMeters; }
        public void setDistanceMeters(long distanceMeters) { this.distanceMeters = distanceMeters; }

        public long getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(long durationSeconds) { this.durationSeconds = durationSeconds; }

        public String getPolyline() { return polyline; }
        public void setPolyline(String polyline) { this.polyline = polyline; }

        public RouteGeometry getGeometry() { return geometry; }
        public void setGeometry(RouteGeometry geometry) { this.geometry = geometry; }
    }

    private RouteOption primary;
    private RouteOption alternative;

    public RouteOption getPrimary() { return primary; }
    public void setPrimary(RouteOption primary) { this.primary = primary; }

    public RouteOption getAlternative() { return alternative; }
    public void setAlternative(RouteOption alternative) { this.alternative = alternative; }
}
