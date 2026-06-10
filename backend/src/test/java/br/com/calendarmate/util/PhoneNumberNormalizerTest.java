package br.com.calendarmate.util;

import br.com.calendarmate.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PhoneNumberNormalizerTest {
    @Test
    void canonicalizesSupportedAdminPhoneFormats() {
        String canonical = "11987654321";

        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("11987654321"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("11 98765-4321"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("(11) 98765-4321"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("+55 11 98765-4321"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("5511987654321"));
    }

    @Test
    void rejectsInvalidPhoneFormats() {
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("12345"));
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("+1 11987654321"));
    }
}
