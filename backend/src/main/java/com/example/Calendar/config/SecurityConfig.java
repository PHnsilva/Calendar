package com.example.Calendar.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http.csrf(csrf -> csrf.disable());

        http.authorizeHttpRequests(auth -> auth
                // ===== PUBLIC =====
                .requestMatchers(HttpMethod.GET,  "/api/servicos/available").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/servicos").permitAll()

                .requestMatchers("/api/verify/**").permitAll()
                .requestMatchers("/api/recovery/**").permitAll()
                .requestMatchers("/api/cep/**").permitAll()

                // token-based client routes (your code validates token)
                .requestMatchers("/api/servicos/me/**").permitAll()
                .requestMatchers("/api/servicos/my").permitAll()

                // routes proxy (token validated inside)
                .requestMatchers("/api/routes/**").permitAll()

                // admin/internal protected by X-ADMIN-TOKEN in controllers
                .requestMatchers("/api/servicos/admin/**").permitAll()
                .requestMatchers("/api/internal/**").permitAll()

                .anyRequest().denyAll()
        );

        // disable form login, keep httpBasic defaults (won't block permitted routes)
        http.httpBasic(Customizer.withDefaults());
        http.formLogin(form -> form.disable());

        return http.build();
    }
}