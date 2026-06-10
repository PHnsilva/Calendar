package br.com.calendarmate.util;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.InvalidPhoneException;

public final class PhoneNumberNormalizer {
    private PhoneNumberNormalizer() {
    }

    public static String normalizeBrazilianPhone(String value) {
        String digits = digitsOnly(value);
        if ((digits.length() == 12 || digits.length() == 13) && digits.startsWith("55")) {
            digits = digits.substring(2);
        }
        if (digits.length() < 10 || digits.length() > 11) {
            throw new InvalidPhoneException("Telefone invalido");
        }
        return digits;
    }

    public static String normalizeBrazilianPhoneOrBlank(String value) {
        try {
            return normalizeBrazilianPhone(value);
        } catch (BadRequestException ex) {
            return "";
        }
    }

    public static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }
}
