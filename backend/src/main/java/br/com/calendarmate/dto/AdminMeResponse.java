package br.com.calendarmate.dto;

import java.util.List;

public class AdminMeResponse {
    private String id;
    private String name;
    private String phone;
    private String role;
    private List<String> permissions;
    private long sessionExpiresAt;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public List<String> getPermissions() { return permissions; }
    public void setPermissions(List<String> permissions) { this.permissions = permissions; }

    public long getSessionExpiresAt() { return sessionExpiresAt; }
    public void setSessionExpiresAt(long sessionExpiresAt) { this.sessionExpiresAt = sessionExpiresAt; }
}
