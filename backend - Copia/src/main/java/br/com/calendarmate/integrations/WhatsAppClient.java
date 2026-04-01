package br.com.calendarmate.integrations;

public interface WhatsAppClient {
    void sendCode(String phoneDigits, String code);
}