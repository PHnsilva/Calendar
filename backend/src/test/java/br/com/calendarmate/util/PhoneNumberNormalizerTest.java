package br.com.calendarmate.util;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.NotMobilePhoneException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PhoneNumberNormalizerTest {
    @Test
    void canonicalizesSupportedBrazilianPhoneFormats() {
        String canonical = "31999999999";

        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("31999999999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("(31) 99999-9999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("+55 31 99999-9999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("5531999999999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianPhone("031999999999"));
    }

    @Test
    void canonicalizesBrazilianMobilePhonesForSms() {
        String canonical = "31999999999";

        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianMobilePhone("31999999999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianMobilePhone("(31) 99999-9999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianMobilePhone("+55 31 99999-9999"));
        assertEquals(canonical, PhoneNumberNormalizer.normalizeBrazilianMobilePhone("5531999999999"));
        assertEquals("+5531999999999", PhoneNumberNormalizer.toE164(canonical));
        assertTrue(PhoneNumberNormalizer.isBrazilianMobileNumber(canonical));
    }

    @Test
    void rejectsInvalidPhoneFormats() {
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("12345"));
        assertThrows(BadRequestException.class, () -> PhoneNumberNormalizer.normalizeBrazilianPhone("+1 11987654321"));
    }

    @Test
    void rejectsLandlinesForSmsVerification() {
        assertEquals("3133334444", PhoneNumberNormalizer.normalizeBrazilianPhone("(31) 3333-4444"));
        assertFalse(PhoneNumberNormalizer.isBrazilianMobileNumber("(31) 3333-4444"));
        assertThrows(NotMobilePhoneException.class, () -> PhoneNumberNormalizer.normalizeBrazilianMobilePhone("(31) 3333-4444"));
    }
}
