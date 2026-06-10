package br.com.calendarmate.config;

import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;

class AppConfigTest {

    @Test
    void restTemplateUsesPatchCompatibleRequestFactory() {
        RestTemplate restTemplate = new AppConfig().restTemplate();

        assertThat(restTemplate.getRequestFactory()).isInstanceOf(JdkClientHttpRequestFactory.class);
    }
}
