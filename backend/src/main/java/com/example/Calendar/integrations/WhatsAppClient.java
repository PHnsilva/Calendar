package com.example.Calendar.integrations;

public interface WhatsAppClient {
    void sendCode(String phoneDigits, String code);
}