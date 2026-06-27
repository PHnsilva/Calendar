package br.com.calendarmate.model;

import java.util.List;

public class AdminPrincipal {
    private final AdminUser user;
    private final AdminUser authenticatedUser;
    private final AdminSession session;

    public AdminPrincipal(AdminUser user, AdminSession session) {
        this.user = user;
        this.authenticatedUser = user;
        this.session = session;
    }

    public AdminPrincipal(AdminUser authenticatedUser, AdminUser workspaceUser, AdminSession session) {
        this.user = workspaceUser;
        this.authenticatedUser = authenticatedUser;
        this.session = session;
    }

    public AdminUser getUser() { return user; }
    public AdminUser getAuthenticatedUser() { return authenticatedUser; }
    public AdminSession getSession() { return session; }
    public String getId() { return user.getId(); }
    public String getName() { return user.getName(); }
    public String getPhoneDigits() { return user.getPhoneDigits(); }
    public AdminRole getRole() { return user.getRole(); }
    public String getAuthenticatedId() { return authenticatedUser == null ? "" : authenticatedUser.getId(); }
    public AdminRole getAuthenticatedRole() { return authenticatedUser == null ? null : authenticatedUser.getRole(); }
    public boolean isOwner() { return user.isOwner(); }
    public boolean isProvider() { return !isOwner(); }
    public boolean isWorkspaceScoped() { return authenticatedUser != null && user != null && !authenticatedUser.getId().equals(user.getId()); }

    public List<String> permissions() {
        if (isOwner()) {
            return List.of(
                    "BOOKINGS_READ_ALL",
                    "BOOKINGS_EDIT_ALL",
                    "FINANCE_READ",
                    "ASSIGN_PROVIDER",
                    "BLOCKS_MANAGE",
                    "HISTORY_READ_ALL",
                    "BUDGET_WRITE",
                    "CLEANUP_RUN"
            );
        }
        return List.of(
                "BOOKINGS_READ_ASSIGNED",
                "BOOKINGS_EDIT_ASSIGNED",
                "BUDGET_WRITE"
        );
    }
}
