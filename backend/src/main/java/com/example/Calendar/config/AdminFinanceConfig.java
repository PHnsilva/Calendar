package com.example.Calendar.config;

import com.example.Calendar.integrations.banking.StatementProvider;
import com.example.Calendar.service.AdminFinanceService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminFinanceConfig {

    @Bean
    public AdminFinanceService adminFinanceService(BankingProperties props, StatementProvider provider) {
        return new AdminFinanceService(props, provider);
    }
}