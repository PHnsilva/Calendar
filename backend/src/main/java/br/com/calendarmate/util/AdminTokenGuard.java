package br.com.calendarmate.util;

import br.com.calendarmate.exception.ForbiddenException;

public final class AdminTokenGuard {

    private static final String ADMIN_TOKEN = System.getenv("ADMIN_TOKEN");

    private AdminTokenGuard() {}

    public static void require(String header) {
        if (ADMIN_TOKEN == null || ADMIN_TOKEN.isBlank()) {
            throw new ForbiddenException("Admin desabilitado (ADMIN_TOKEN não configurado)");
        }
        if (header == null || !header.equals(ADMIN_TOKEN)) {
            throw new ForbiddenException("Admin token required");
        }
    }
}