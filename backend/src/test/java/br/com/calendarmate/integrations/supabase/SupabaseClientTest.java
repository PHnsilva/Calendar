package br.com.calendarmate.integrations.supabase;

import br.com.calendarmate.exception.ExternalServiceException;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.lang.reflect.Method;
import java.net.ProtocolException;

import static org.assertj.core.api.Assertions.assertThat;

class SupabaseClientTest {

    @Test
    void classifiesUnsupportedHttpMethodSeparatelyFromNetworkErrors() throws Exception {
        SupabaseClient client = new SupabaseClient(
                new RestTemplate(),
                "https://example.supabase.co",
                "sb_secret_test",
                "public");

        Method method = SupabaseClient.class.getDeclaredMethod(
                "mapResourceAccessException",
                ResourceAccessException.class);
        method.setAccessible(true);

        ExternalServiceException mapped = (ExternalServiceException) method.invoke(
                client,
                new ResourceAccessException(
                        "I/O error",
                        new ProtocolException("Invalid HTTP method: PATCH")));

        assertThat(mapped.getErrorCode()).isEqualTo("SUPABASE_HTTP_CLIENT_UNSUPPORTED_METHOD");
    }
}
