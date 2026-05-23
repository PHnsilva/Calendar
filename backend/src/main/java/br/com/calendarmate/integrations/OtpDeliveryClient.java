package br.com.calendarmate.integrations;

public interface OtpDeliveryClient {
    void sendCode(String phoneDigits, String code);

    default String getChannel() {
        return "DUMMY";
    }
}
