package br.com.calendarmate.config;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AppPropertiesTest {
    @Test
    void enablesOtpDebugLoggingOnlyForLocalProfiles() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "debugOtpCode", true);
        set(props, "springProfilesActive", "local");
        set(props, "appEnv", "");

        assertTrue(props.isOtpDebugLoggingEnabled());

        set(props, "springProfilesActive", "prod");
        set(props, "verificationChannel", "SMS");
        set(props, "frontendUrl", "https://calendar-mate.vercel.app");
        assertFalse(props.isOtpDebugLoggingEnabled());
    }

    @Test
    void appendsDebugAdminOnlyForLocalProfiles() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "adminUsersCsv", "31911112222|Base Admin|OWNER");
        set(props, "debugDevAdminEnabled", true);
        set(props, "debugDevAdminPhone", "31995438467");
        set(props, "debugDevAdminName", "Admin Debug");
        set(props, "debugDevAdminRole", "OWNER");
        set(props, "springProfilesActive", "local");
        set(props, "appEnv", "");

        String localRegistry = props.getAdminUsersCsv();
        assertTrue(localRegistry.contains("31911112222|Base Admin|OWNER"));
        assertTrue(localRegistry.contains("31995438467|Admin Debug|OWNER"));
        assertTrue(localRegistry.contains("31900000001|Prestador 1|PROVIDER|provider-1"));
        assertTrue(localRegistry.contains("31900000002|Prestador 2|PROVIDER|provider-2"));
        assertTrue(localRegistry.contains("31900000003|Prestador 3|PROVIDER|provider-3"));

        set(props, "springProfilesActive", "prod");
        String prodRegistry = props.getAdminUsersCsv();
        assertTrue(prodRegistry.contains("31911112222|Base Admin|OWNER"));
        assertFalse(prodRegistry.contains("Admin Debug"));
        assertTrue(prodRegistry.contains("31900000001|Prestador 1|PROVIDER|provider-1"));
    }

    @Test
    void defaultAdminRegistryIncludesOwnerAndThreeBaseProviders() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "adminUsersCsv", "");
        set(props, "debugDevAdminEnabled", false);

        String registry = props.getAdminUsersCsv();

        assertTrue(registry.contains("31995438467|SG Admin|OWNER|owner-main"));
        assertTrue(registry.contains("31900000001|Prestador 1|PROVIDER|provider-1"));
        assertTrue(registry.contains("31900000002|Prestador 2|PROVIDER|provider-2"));
        assertTrue(registry.contains("31900000003|Prestador 3|PROVIDER|provider-3"));
    }

    @Test
    void exposesDefaultTemporaryAdminProviderPasswordFromConfig() {
        AppProperties props = new AppProperties();

        assertEquals("#052430Vs", props.getAdminTempPassword());
    }

    @Test
    void configuredProviderByIdOverridesDefaultPlaceholderPhone() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "adminUsersCsv", "31988887777|Prestador Real|PROVIDER|provider-1");
        set(props, "debugDevAdminEnabled", false);

        String registry = props.getAdminUsersCsv();

        assertTrue(registry.contains("31988887777|Prestador Real|PROVIDER|provider-1"));
        assertFalse(registry.contains("31900000001|Prestador 1|PROVIDER|provider-1"));
    }

    @Test
    void treatsDefaultDummyLocalConfigurationAsDebugSafe() throws Exception {
        AppProperties props = new AppProperties();
        set(props, "debugOtpCode", true);
        set(props, "springProfilesActive", "");
        set(props, "appEnv", "");
        set(props, "verificationChannel", "DUMMY");
        set(props, "frontendUrl", "http://localhost:5173");
        set(props, "supabaseEnabled", false);
        set(props, "supabaseUrl", "");
        set(props, "supabaseKey", "");

        assertTrue(props.isOtpDebugLoggingEnabled());
    }

    private static void set(Object target, String fieldName, Object value) throws Exception {
        Field field = AppProperties.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }
}
