package br.com.calendarmate.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class PublicBookingDisabledConfig implements WebMvcConfigurer {

    private final PublicBookingDisabledInterceptor interceptor;

    public PublicBookingDisabledConfig(PublicBookingDisabledInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor);
    }
}
