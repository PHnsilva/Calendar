package br.com.calendarmate.config;

import br.com.calendarmate.util.AdminTokenGuard;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminTokenConfig {

    private final AppProperties appProperties;

    public AdminTokenConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @PostConstruct
    public void init() {
        AdminTokenGuard.configure(appProperties.getAdminToken());
    }
}
