package com.example.Calendar.util;

import java.text.Normalizer;
import java.util.Locale;

public final class LocationNormalizer {

    private LocationNormalizer() {}

    /**
     * Normaliza cidade/bairro/etc:
     * - trim
     * - lowercase
     * - remove acentos
     * - colapsa espaços múltiplos
     */
    public static String normalizeCity(String city) {
        if (city == null) return "";
        String s = city.trim();
        if (s.isEmpty()) return "";

        // remove acentos
        s = Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");

        // lowercase
        s = s.toLowerCase(Locale.ROOT);

        // espaços
        s = s.replaceAll("\\s+", " ").trim();

        return s;
    }

    public static String normalizeState(String state) {
        if (state == null) return "";
        return state.trim().toUpperCase(Locale.ROOT);
    }
}