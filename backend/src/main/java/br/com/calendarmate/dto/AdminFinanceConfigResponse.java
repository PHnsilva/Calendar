package br.com.calendarmate.dto;

public class AdminFinanceConfigResponse {
    public static class Features {
        private boolean interPjEnabled;

        public boolean isInterPjEnabled() { return interPjEnabled; }
        public void setInterPjEnabled(boolean interPjEnabled) { this.interPjEnabled = interPjEnabled; }
    }

    public static class PixConfig {
        private String key;
        private String recipientName;
        private String recipientCity;
        private String description;

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }
        public String getRecipientName() { return recipientName; }
        public void setRecipientName(String recipientName) { this.recipientName = recipientName; }
        public String getRecipientCity() { return recipientCity; }
        public void setRecipientCity(String recipientCity) { this.recipientCity = recipientCity; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
    }

    private Features features;
    private PixConfig pix;

    public Features getFeatures() { return features; }
    public void setFeatures(Features features) { this.features = features; }
    public PixConfig getPix() { return pix; }
    public void setPix(PixConfig pix) { this.pix = pix; }
}
