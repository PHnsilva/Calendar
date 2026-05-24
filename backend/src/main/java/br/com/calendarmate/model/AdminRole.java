package br.com.calendarmate.model;

import java.util.Locale;

public enum AdminRole {
    OWNER,
    PROVIDER;

    public static AdminRole from(String value) {
        String normalized = value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
        if ("OWNER".equals(normalized)) {
            return OWNER;
        }
        return PROVIDER;
    }
}
