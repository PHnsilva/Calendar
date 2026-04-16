package br.com.calendarmate.util;

import br.com.calendarmate.exception.ForbiddenException;

public final class AdminTokenGuard {

    private static volatile String adminToken = "";

    private AdminTokenGuard() {}

    public static void configure(String token) {
        adminToken = token == null ? "" : token.trim();
    }

    public static boolean isConfigured() {
        return adminToken != null && !adminToken.isBlank();
    }

    public static void require(String header) {
        if (!isConfigured()) {
            throw new ForbiddenException("Admin desabilitado (ADMIN_TOKEN não configurado)");
        }
        if (header == null || !header.trim().equals(adminToken)) {
            throw new ForbiddenException("Admin token required");
        }
    }
}
