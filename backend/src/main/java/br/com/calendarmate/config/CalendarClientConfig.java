package br.com.calendarmate.config;

import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.google.DummyCalendarClient;
import br.com.calendarmate.google.GoogleCalendarClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CalendarClientConfig {

    @Value("${calendar.google.enabled:${GOOGLE_CALENDAR_ENABLED:false}}")
    private boolean googleCalendarEnabled;

    @Value("${GOOGLE_CLIENT_ID:}")
    private String googleClientId;

    @Value("${GOOGLE_CLIENT_SECRET:}")
    private String googleClientSecret;

    @Value("${GOOGLE_REFRESH_TOKEN:}")
    private String googleRefreshToken;

    @Value("${GOOGLE_CALENDAR_ID:primary}")
    private String googleCalendarId;

    @Value("${APP_NAME:MeuApp}")
    private String appName;

    @Bean
    public CalendarClient calendarClient() {
        if (!googleCalendarEnabled) {
            return new DummyCalendarClient();
        }

        if (!notBlank(googleClientId) || !notBlank(googleClientSecret) || !notBlank(googleRefreshToken)) {
            throw new IllegalStateException("Google Calendar está habilitado, mas as credenciais obrigatórias não foram configuradas");
        }

        try {
            return new GoogleCalendarClient(
                    googleClientId,
                    googleClientSecret,
                    googleRefreshToken,
                    notBlank(googleCalendarId) ? googleCalendarId.trim() : "primary",
                    notBlank(appName) ? appName.trim() : "MeuApp");
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível inicializar o Google Calendar com as credenciais configuradas", ex);
        }
    }

    private static boolean notBlank(String v) { return v != null && !v.isBlank(); }
}
