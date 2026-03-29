package br.com.calendarmate.model;

import java.util.Locale;

public enum AvailabilityRuleMode {
    BLOCK,
    OPEN;

    public static AvailabilityRuleMode from(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("mode é obrigatório");
        }

        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "BLOCK" -> BLOCK;
            case "OPEN" -> OPEN;
            default -> throw new IllegalArgumentException("mode deve ser BLOCK ou OPEN");
        };
    }
}