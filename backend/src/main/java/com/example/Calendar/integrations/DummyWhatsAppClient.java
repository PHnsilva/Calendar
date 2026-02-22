package com.example.Calendar.integrations;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class DummyWhatsAppClient implements WhatsAppClient {
    private static final Logger log = LoggerFactory.getLogger(DummyWhatsAppClient.class);

    @Override
    public void sendCode(String phoneDigits, String code) {
        log.info("[DUMMY WhatsApp] Enviaria código {} para {}", code, phoneDigits);
    }
}