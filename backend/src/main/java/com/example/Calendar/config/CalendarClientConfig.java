package com.example.Calendar.config;

import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.google.DummyCalendarClient;
import com.example.Calendar.google.GoogleCalendarClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CalendarClientConfig {

    @Bean
    public CalendarClient calendarClient() {
        String clientId = env("GOOGLE_CLIENT_ID");
        String clientSecret = env("GOOGLE_CLIENT_SECRET");
        String refreshToken = env("GOOGLE_REFRESH_TOKEN");
        String calendarId = env("GOOGLE_CALENDAR_ID");
        String appName = envOr("GOOGLE_APP_NAME", "calendar-backend");

        boolean hasGoogle =
                notBlank(clientId) &&
                notBlank(clientSecret) &&
                notBlank(refreshToken) &&
                notBlank(calendarId);

        if (!hasGoogle) {
            // fallback DEMO (não quebra o projeto sem credenciais)
            return new DummyCalendarClient();
        }

        try {
            return new GoogleCalendarClient(clientId, clientSecret, refreshToken, calendarId, appName);
        } catch (Exception ex) {
            // fallback seguro (evita crash)
            return new DummyCalendarClient();
        }
    }

    private static String env(String k) { return System.getenv(k); }
    private static String envOr(String k, String def) {
        String v = System.getenv(k);
        return (v == null || v.isBlank()) ? def : v;
    }
    private static boolean notBlank(String v) { return v != null && !v.isBlank(); }
}
