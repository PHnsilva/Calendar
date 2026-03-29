package br.com.calendarmate.dto;

public class AdminHealthResponse {
    private boolean ok;
    private String provider;
    private String message;

    public AdminHealthResponse() {}

    public AdminHealthResponse(boolean ok, String provider, String message) {
        this.ok = ok;
        this.provider = provider;
        this.message = message;
    }

    public boolean isOk() { return ok; }
    public void setOk(boolean ok) { this.ok = ok; }

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}