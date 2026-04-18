package br.com.calendarmate.integrations;

public class DummyWhatsAppClient implements OtpDeliveryClient {

    @Override
    public void sendCode(String phoneDigits, String code) {
        System.out.println("[DUMMY OTP] Enviando OTP para " + phoneDigits + ": " + code);
    }

    @Override
    public String getChannel() {
        return "DUMMY";
    }
}