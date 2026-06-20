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

        assertEquals(
                "31911112222|Base Admin|OWNER;31995438467|Admin Debug|OWNER",
                props.getAdminUsersCsv());

        set(props, "springProfilesActive", "prod");
        assertEquals("31911112222|Base Admin|OWNER", props.getAdminUsersCsv());
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
