package com.example.Calendar.config;

import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.google.DummyCalendarClient;
import com.example.Calendar.google.GoogleCalendarClient;
import com.example.Calendar.service.ServicoService;
import com.example.Calendar.service.TokenUtil;
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
    public ServicoService servicoService(CalendarClient calendarClient, TokenUtil tokenUtil) {
        return new ServicoService(calendarClient, tokenUtil);
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}
