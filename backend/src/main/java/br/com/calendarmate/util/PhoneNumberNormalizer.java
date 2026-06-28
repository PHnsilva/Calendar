package br.com.calendarmate.util;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.InvalidPhoneException;
import br.com.calendarmate.exception.NotMobilePhoneException;

public final class PhoneNumberNormalizer {
    private PhoneNumberNormalizer() {
    }

    public static String normalizeBrazilianPhone(String value) {
        String digits = stripBrazilianPrefix(digitsOnly(value));
        if (!hasValidBrazilianLengthAndDdd(digits)) {
            throw new InvalidPhoneException("Telefone invalido");
        }
        return digits;
    }

    public static String normalizeBrazilianMobilePhone(String value) {
        String digits = normalizeBrazilianPhone(value);
        if (!isBrazilianMobileNumber(digits)) {
            throw new NotMobilePhoneException("Informe um celular brasileiro com DDD e 9 digitos.");
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

    public static String normalizeBrazilianMobilePhoneOrBlank(String value) {
        try {
            return normalizeBrazilianMobilePhone(value);
        } catch (BadRequestException ex) {
            return "";
        }
    }

    public static boolean isBrazilianMobileNumber(String value) {
        String digits = normalizeBrazilianPhoneOrBlank(value);
        return digits.length() == 11 && digits.charAt(2) == '9';
    }

    public static String toE164(String value) {
        return "+55" + normalizeBrazilianPhone(value);
    }

    public static String maskBrazilianPhone(String value) {
        String digits = normalizeBrazilianPhoneOrBlank(value);
        if (digits.isBlank()) {
            digits = digitsOnly(value);
        }
        if (digits.length() == 10 || digits.length() == 11) {
            digits = "55" + digits;
        }
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return "+" + digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
    }

    public static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    private static String stripBrazilianPrefix(String digits) {
        String out = digits == null ? "" : digits.trim();

        while (out.length() > 11 && out.startsWith("00")) {
            out = out.substring(2);
        }
        if ((out.length() == 12 || out.length() == 13) && out.startsWith("55")) {
            out = out.substring(2);
        }
        while (out.length() > 11 && out.startsWith("0")) {
            out = out.substring(1);
        }

        return out;
    }

    private static boolean hasValidBrazilianLengthAndDdd(String digits) {
        if (digits.length() != 10 && digits.length() != 11) {
            return false;
        }
        return digits.charAt(0) >= '1'
                && digits.charAt(0) <= '9'
                && digits.charAt(1) >= '1'
                && digits.charAt(1) <= '9';
    }
}
