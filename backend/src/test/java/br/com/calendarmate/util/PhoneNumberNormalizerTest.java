package br.com.calendarmate.util;

import br.com.calendarmate.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PhoneNumberNormalizerTest {
    @Test
    void canonicalizesSupportedAdminPhoneFormats() {
        String canonical = "31995438467";

        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("31995438467"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("31 99543-8467"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("(31) 99543-8467"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("+55 31 99543-8467"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("5531995438467"));
    }

    @Test
    void rejectsInvalidPhoneFormats() {
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("12345"));
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("+1 31995438467"));
    }
}
