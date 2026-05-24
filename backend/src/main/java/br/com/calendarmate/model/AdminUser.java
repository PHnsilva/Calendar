package br.com.calendarmate.model;

public class AdminUser {
    private String id;
    private String phoneDigits;
    private String name;
    private AdminRole role;
    private boolean active;
    private long createdAtEpochSec;
    private long lastLoginAtEpochSec;

    public AdminUser() {
    }

    public AdminUser(String id, String phoneDigits, String name, AdminRole role, boolean active, long createdAtEpochSec, long lastLoginAtEpochSec) {
        this.id = id;
        this.phoneDigits = phoneDigits;
        this.name = name;
        this.role = role;
        this.active = active;
        this.createdAtEpochSec = createdAtEpochSec;
        this.lastLoginAtEpochSec = lastLoginAtEpochSec;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getPhoneDigits() { return phoneDigits; }
    public void setPhoneDigits(String phoneDigits) { this.phoneDigits = phoneDigits; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public AdminRole getRole() { return role; }
    public void setRole(AdminRole role) { this.role = role; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public long getCreatedAtEpochSec() { return createdAtEpochSec; }
    public void setCreatedAtEpochSec(long createdAtEpochSec) { this.createdAtEpochSec = createdAtEpochSec; }

    public long getLastLoginAtEpochSec() { return lastLoginAtEpochSec; }
    public void setLastLoginAtEpochSec(long lastLoginAtEpochSec) { this.lastLoginAtEpochSec = lastLoginAtEpochSec; }

    public boolean isOwner() { return AdminRole.OWNER.equals(role); }
}
