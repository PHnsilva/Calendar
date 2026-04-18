package br.com.calendarmate.integrations;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DummyWhatsAppClient implements OtpDeliveryClient {

    private static final Logger log = LoggerFactory.getLogger(DummyWhatsAppClient.class);

    @Override
    public void sendCode(String phoneDigits, String code) {
        log.info("[DUMMY OTP] Enviando OTP para {}: {}", phoneDigits, code);
    }

    @Override
    public String getChannel() {
        return "DUMMY";
    }
}
