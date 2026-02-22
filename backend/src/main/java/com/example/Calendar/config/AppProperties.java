package com.example.Calendar.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class AppProperties {

    @Value("${app.zone:America/Sao_Paulo}")
    private String zone;

    // área atendida (trava cidade/UF)
    @Value("${app.service.city:}")
    private String serviceCity;

    @Value("${app.service.state:}")
    private String serviceState;

    // reserva pendente expira (minutos)
    @Value("${app.pending.ttlMinutes:10}")
    private long pendingTtlMinutes;

    // OTP
    @Value("${app.otp.ttlSeconds:300}")
    private long otpTtlSeconds;

    @Value("${app.otp.resendAfterSeconds:3}")
    private long otpResendAfterSeconds;

    // WhatsApp (Cloud API)
    @Value("${whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${whatsapp.token:}")
    private String whatsappToken;

    @Value("${whatsapp.phoneNumberId:}")
    private String whatsappPhoneNumberId;

    public String getZone() { return zone; }
    public String getServiceCity() { return serviceCity; }
    public String getServiceState() { return serviceState; }

    public Duration getPendingTtl() { return Duration.ofMinutes(pendingTtlMinutes); }
    public Duration getOtpTtl() { return Duration.ofSeconds(otpTtlSeconds); }
    public Duration getOtpResendAfter() { return Duration.ofSeconds(otpResendAfterSeconds); }

    public boolean isWhatsappEnabled() { return whatsappEnabled; }
    public String getWhatsappToken() { return whatsappToken; }
    public String getWhatsappPhoneNumberId() { return whatsappPhoneNumberId; }
}