package com.example.Calendar.config;

import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.google.DummyCalendarClient;
import com.example.Calendar.google.GoogleCalendarClient;
import com.example.Calendar.integrations.DummyWhatsAppClient;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.service.InMemoryVerificationStore;
import com.example.Calendar.service.ServicoService;
import com.example.Calendar.service.TokenUtil;
import com.example.Calendar.service.VerificationService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Bean
    public TokenUtil tokenUtil() {
        String secret = System.getenv().getOrDefault("HMAC_SECRET", "dev-secret");
        long ttl = 7L * 24L * 3600L; // 7 dias
        return new TokenUtil(secret, ttl);
    }

    @Bean
    public CalendarClient calendarClient() {
        String clientId = System.getenv("GOOGLE_CLIENT_ID");
        String clientSecret = System.getenv("GOOGLE_CLIENT_SECRET");
        String refreshToken = System.getenv("GOOGLE_REFRESH_TOKEN");
        String calendarId = System.getenv().getOrDefault("GOOGLE_CALENDAR_ID", "primary");
        String appName = System.getenv().getOrDefault("APP_NAME", "MeuApp");

        if (isBlank(clientId) || isBlank(clientSecret) || isBlank(refreshToken)) {
            return new DummyCalendarClient();
        }

        try {
            return new GoogleCalendarClient(clientId, clientSecret, refreshToken, calendarId, appName);
        } catch (Exception e) {
            System.err.println("Falha ao iniciar GoogleCalendarClient: " + e.getMessage());
            e.printStackTrace();
            return new DummyCalendarClient();
        }
    }

    @Bean
    public ServicoService servicoService(CalendarClient calendarClient, TokenUtil tokenUtil) {
        return new ServicoService(calendarClient, tokenUtil);
    }

    @Bean
    public InMemoryVerificationStore inMemoryVerificationStore() {
        return new InMemoryVerificationStore();
    }

    @Bean
    public WhatsAppClient whatsAppClient(AppProperties props) {
        // por enquanto dummy (depois troca pro real)
        return new DummyWhatsAppClient();
    }

    @Bean
    public VerificationService verificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            InMemoryVerificationStore store,
            WhatsAppClient whatsAppClient,
            AppProperties props) {
        return new VerificationService(calendarClient, tokenUtil, store, whatsAppClient, props);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
