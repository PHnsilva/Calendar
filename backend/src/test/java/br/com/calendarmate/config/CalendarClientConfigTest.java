package br.com.calendarmate.config;

import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.google.DummyCalendarClient;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class CalendarClientConfigTest {

    @Test
    void explicitlyDisabledGoogleCalendarSelectsDummyClient() {
        CalendarClientConfig config = new CalendarClientConfig();
        ReflectionTestUtils.setField(config, "googleCalendarEnabled", false);

        CalendarClient client = config.calendarClient();

        assertThat(client).isInstanceOf(DummyCalendarClient.class);
    }
}
