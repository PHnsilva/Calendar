package br.com.calendarmate.dto;

public class RouteComputeResponse {

    public static class RouteOption {
        private long distanceMeters;
        private long durationSeconds;
        private String polyline;

        public RouteOption() {}

        public RouteOption(long distanceMeters, long durationSeconds, String polyline) {
            this.distanceMeters = distanceMeters;
            this.durationSeconds = durationSeconds;
            this.polyline = polyline;
        }

        public long getDistanceMeters() { return distanceMeters; }
        public void setDistanceMeters(long distanceMeters) { this.distanceMeters = distanceMeters; }

        public long getDurationSeconds() { return durationSeconds; }
        public void setDurationSeconds(long durationSeconds) { this.durationSeconds = durationSeconds; }

        public String getPolyline() { return polyline; }
        public void setPolyline(String polyline) { this.polyline = polyline; }
    }

    private RouteOption primary;
    private RouteOption alternative;

    public RouteOption getPrimary() { return primary; }
    public void setPrimary(RouteOption primary) { this.primary = primary; }

    public RouteOption getAlternative() { return alternative; }
    public void setAlternative(RouteOption alternative) { this.alternative = alternative; }
}