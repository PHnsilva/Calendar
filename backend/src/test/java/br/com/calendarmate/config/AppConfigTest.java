package br.com.calendarmate.config;

import br.com.calendarmate.integrations.DummyWhatsAppClient;
import br.com.calendarmate.integrations.MetaWhatsAppClient;
import br.com.calendarmate.integrations.MisconfiguredOtpDeliveryClient;
import br.com.calendarmate.integrations.NotificationApiSmsClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.integrations.geoapify.GeoapifyRoutesClient;
import br.com.calendarmate.integrations.google.GoogleRoutesClient;
import br.com.calendarmate.integrations.routes.RouteClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AppConfigTest {

    @Test
    void restTemplateUsesPatchCompatibleRequestFactory() {
        RestTemplate restTemplate = new AppConfig().restTemplate();

        assertThat(restTemplate.getRequestFactory()).isInstanceOf(JdkClientHttpRequestFactory.class);
    }

    @Test
    void otpDeliveryDefaultsToDummyForAnUnconfiguredChannel() {
        OtpDeliveryClient client = new AppConfig().otpDeliveryClient(mock(RestTemplate.class), new AppProperties());

        assertThat(client).isInstanceOf(DummyWhatsAppClient.class);
    }

    @Test
    void otpDeliveryUsesMisconfiguredAdapterWhenSmsIsIncomplete() {
        AppProperties properties = propertiesWith("verificationChannel", "SMS");

        OtpDeliveryClient client = new AppConfig().otpDeliveryClient(mock(RestTemplate.class), properties);

        assertThat(client).isInstanceOf(MisconfiguredOtpDeliveryClient.class);
        assertThat(client.getChannel()).isEqualTo("NotificationAPI");
    }

    @Test
    void otpDeliverySelectsNotificationApiWhenSmsConfigurationIsReady() {
        AppProperties properties = propertiesWith("verificationChannel", "SMS");
        ReflectionTestUtils.setField(properties, "smsNotificationApiEnabled", true);
        ReflectionTestUtils.setField(properties, "smsNotificationApiKey", "test-key");
        ReflectionTestUtils.setField(properties, "smsNotificationApiType", "calendar_otp");

        OtpDeliveryClient client = new AppConfig().otpDeliveryClient(mock(RestTemplate.class), properties);

        assertThat(client).isInstanceOf(NotificationApiSmsClient.class);
        assertThat(client.getChannel()).isEqualTo("SMS");
    }

    @Test
    void otpDeliverySelectsMetaWhatsAppOnlyWhenItsConfigurationIsComplete() {
        AppProperties properties = propertiesWith("verificationChannel", "WHATSAPP");
        ReflectionTestUtils.setField(properties, "whatsappEnabled", true);
        ReflectionTestUtils.setField(properties, "whatsappToken", "test-token");
        ReflectionTestUtils.setField(properties, "whatsappPhoneNumberId", "phone-id");
        ReflectionTestUtils.setField(properties, "whatsappTemplateName", "otp-template");

        OtpDeliveryClient client = new AppConfig().otpDeliveryClient(mock(RestTemplate.class), properties);

        assertThat(client).isInstanceOf(MetaWhatsAppClient.class);
    }

    @Test
    void otpDeliveryUsesMisconfiguredAdapterWhenWhatsAppIsIncomplete() {
        AppProperties properties = propertiesWith("verificationChannel", "META");

        OtpDeliveryClient client = new AppConfig().otpDeliveryClient(mock(RestTemplate.class), properties);

        assertThat(client).isInstanceOf(MisconfiguredOtpDeliveryClient.class);
        assertThat(client.getChannel()).isEqualTo("MetaWhatsApp");
    }

    @Test
    void routeClientPrefersGeoapifyWhenEnabledWithAKey() {
        AppProperties properties = propertiesWith("geoapifyEnabled", true);
        ReflectionTestUtils.setField(properties, "geoapifyApiKey", "geo-key");
        GeoapifyRoutesClient geoapify = mock(GeoapifyRoutesClient.class);
        GoogleRoutesClient google = mock(GoogleRoutesClient.class);

        RouteClient selected = new AppConfig().routeClient(properties, geoapify, google);

        assertThat(selected).isSameAs(geoapify);
    }

    @Test
    void routeClientFallsBackToGoogleWhenGeoapifyIsDisabledOrMissingItsKey() {
        AppConfig config = new AppConfig();
        GeoapifyRoutesClient geoapify = mock(GeoapifyRoutesClient.class);
        GoogleRoutesClient google = mock(GoogleRoutesClient.class);
        AppProperties disabled = propertiesWith("geoapifyEnabled", false);
        ReflectionTestUtils.setField(disabled, "geoapifyApiKey", "geo-key");
        AppProperties missingKey = propertiesWith("geoapifyEnabled", true);

        assertThat(config.routeClient(disabled, geoapify, google)).isSameAs(google);
        assertThat(config.routeClient(missingKey, geoapify, google)).isSameAs(google);
    }

    private AppProperties propertiesWith(String field, Object value) {
        AppProperties properties = new AppProperties();
        ReflectionTestUtils.setField(properties, field, value);
        return properties;
    }
}
