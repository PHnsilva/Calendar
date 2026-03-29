package br.com.calendarmate.config;

import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.google.GoogleCalendarClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CalendarClientConfig {

    private final AppProperties props;

    public CalendarClientConfig(AppProperties props) {
        this.props = props;
    }

    @Bean
    public CalendarClient calendarClient() {
        String clientId = env("GOOGLE_CLIENT_ID");
        String clientSecret = env("GOOGLE_CLIENT_SECRET");
        String refreshToken = env("GOOGLE_REFRESH_TOKEN");
        String calendarId = envOr("GOOGLE_CALENDAR_ID", "primary");
        String appName = envOr("APP_NAME", "MeuApp");

        boolean hasGoogle =
                notBlank(clientId) &&
                notBlank(clientSecret) &&
                notBlank(refreshToken);

        if (!hasGoogle) {
            return new DummyCalendarClient();
        }

        try {
            return new GoogleCalendarClient(clientId, clientSecret, refreshToken, calendarId, appName, props.getZone());
        } catch (Exception ex) {
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