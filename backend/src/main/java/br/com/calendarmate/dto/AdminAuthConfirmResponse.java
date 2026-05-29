package br.com.calendarmate.dto;

public class AdminAuthConfirmResponse {
    private String sessionToken;
    private AdminMeResponse admin;

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public AdminMeResponse getAdmin() { return admin; }
    public void setAdmin(AdminMeResponse admin) { this.admin = admin; }
}
