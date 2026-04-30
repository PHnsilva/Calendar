package br.com.calendarmate.integrations;

public interface WhatsAppClient extends OtpDeliveryClient {
    @Override
    void sendCode(String phoneDigits, String code);

    @Override
    default String getChannel() {
        return "META";
    }
}
