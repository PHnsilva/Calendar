package br.com.calendarmate.integrations;

import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DummyWhatsAppClient implements WhatsAppClient {
    private static final Logger log = LoggerFactory.getLogger(DummyWhatsAppClient.class);

    @Override
    public void sendCode(String phoneDigits, String code) {
        log.info("Dummy verification provider accepted request phone={}", maskPhone(phoneDigits));
    }

    private String maskPhone(String phoneDigits) {
        String digits = PhoneNumberNormalizer.digitsOnly(phoneDigits);
        if (digits.length() == 10 || digits.length() == 11) {
            digits = "55" + digits;
        }
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return "+" + digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
    }
}
