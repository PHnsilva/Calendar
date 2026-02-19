package com.example.Calendar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {

        String frontendUrl = System.getenv("FRONTEND_URL");

        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {

                if (frontendUrl == null || frontendUrl.isBlank()) {
                    // MODO DESENVOLVIMENTO (sem frontend ainda)
                    registry.addMapping("/**")
                            .allowedOrigins("*")
                            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                            .allowedHeaders("*")
                            .allowCredentials(false);
                } else {
                    // MODO PRODUÇÃO (quando definir FRONTEND_URL)
                    registry.addMapping("/**")
                            .allowedOrigins(frontendUrl)
                            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                            .allowedHeaders("*")
                            .allowCredentials(true);
                }
            }
        };
    }
}
