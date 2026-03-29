package br.com.calendarmate.config;

import br.com.calendarmate.integrations.banking.StatementProvider;
import br.com.calendarmate.service.AdminFinanceService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminFinanceConfig {

    @Bean
    public AdminFinanceService adminFinanceService(
            BankingProperties props,
            StatementProvider provider,
            AppProperties appProperties) {
        return new AdminFinanceService(props, provider, appProperties);
    }
}