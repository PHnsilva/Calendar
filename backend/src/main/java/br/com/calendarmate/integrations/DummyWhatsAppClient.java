package br.com.calendarmate.integrations;

public class DummyWhatsAppClient implements WhatsAppClient {

    @Override
    public void sendCode(String phoneDigits, String code) {
        System.out.println("[DUMMY WhatsApp] Enviando OTP para " + phoneDigits + ": " + code);
    }
}