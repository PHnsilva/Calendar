package com.example.Calendar.config;

import com.example.Calendar.util.LocationNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import java.time.LocalDate;
import java.time.Duration;
import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class AppProperties {

    @Value("${app.zone:America/Sao_Paulo}")
    private String zone;

    @Value("${app.schedule.cycleStart:}")
    private String scheduleCycleStart;

    // ====== LEGADO (compat) ======
    @Value("${app.service.city:}")
    private String serviceCity;

    @Value("${app.service.state:}")
    private String serviceState;

    // ====== NOVO (A) ======
    @Value("${app.service.allowedCities:}")
    private String allowedCitiesCsv;

    @Value("${app.service.allowedState:}")
    private String allowedState;

    @Value("${app.service.allowedStates:}")
    private String allowedStatesCsv;

    // ====== PENDING ======
    @Value("${app.pending.ttlMinutes:10}")
    private long pendingTtlMinutes;

    @Value("${app.pending.blockOtherBookings:true}")
    private boolean blockOtherBookingsWhenPending;

    // ====== OTP ======
    @Value("${app.otp.ttlSeconds:300}")
    private long otpTtlSeconds;

    @Value("${app.otp.resendAfterSeconds:3}")
    private long otpResendAfterSeconds;

    // ====== WhatsApp ======
    @Value("${whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${whatsapp.token:}")
    private String whatsappToken;

    @Value("${whatsapp.phoneNumberId:}")
    private String whatsappPhoneNumberId;

    // ====== Supabase ======
    @Value("${supabase.enabled:false}")
    private boolean supabaseEnabled;

    @Value("${supabase.url:}")
    private String supabaseUrl;

    // use service key no backend
    @Value("${supabase.key:}")
    private String supabaseKey;

    @Value("${supabase.schema:public}")
    private String supabaseSchema;

    @Value("${supabase.table.verification_sessions:verification_sessions}")
    private String tableVerification;

    @Value("${supabase.table.pending_records:pending_records}")
    private String tablePending;

    @Value("${supabase.table.history_records:history_records}")
    private String tableHistory;

    @Value("${google.maps.enabled:false}")
    private boolean googleMapsEnabled;

    @Value("${google.maps.apiKey:}")
    private String googleMapsApiKey;

    @Value("${google.maps.routes.traffic:true}")
    private boolean googleRoutesTraffic;

    @Value("${google.maps.routes.fieldMask:routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline}")
    private String googleRoutesFieldMask;

    @Value("${whatsapp.templateName:}")
    private String whatsappTemplateName;

    @Value("${whatsapp.language:pt_BR}")
    private String whatsappLanguage;

    public String getZone() {
        return zone;
    }

    public String getServiceCity() {
        return serviceCity == null ? "" : serviceCity.trim();
    }

    public String getServiceState() {
        return serviceState == null ? "" : serviceState.trim();
    }

    public Set<String> getAllowedCitiesNormalized() {
        String csv = (allowedCitiesCsv == null ? "" : allowedCitiesCsv.trim());
        if (csv.isBlank())
            return Collections.emptySet();

        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(LocationNormalizer::normalizeCity)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public Set<String> getAllowedStatesUpper() {
        String csv = (allowedStatesCsv == null ? "" : allowedStatesCsv.trim());
        String single = (allowedState == null ? "" : allowedState.trim());
        String legacy = (serviceState == null ? "" : serviceState.trim());

        LinkedHashSet<String> out = new LinkedHashSet<>();

        if (!csv.isBlank()) {
            Arrays.stream(csv.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isBlank())
                    .map(LocationNormalizer::normalizeState)
                    .filter(s -> !s.isBlank())
                    .forEach(out::add);
            return out;
        }

        if (!single.isBlank()) {
            out.add(LocationNormalizer.normalizeState(single));
            return out;
        }

        if (!legacy.isBlank()) {
            out.add(LocationNormalizer.normalizeState(legacy));
            return out;
        }

        return Collections.emptySet();
    }

    public String getLegacyCityNormalized() {
        String c = (serviceCity == null ? "" : serviceCity.trim());
        return LocationNormalizer.normalizeCity(c);
    }

    public Duration getPendingTtl() {
        return Duration.ofMinutes(pendingTtlMinutes);
    }

    public boolean isBlockOtherBookingsWhenPending() {
        return blockOtherBookingsWhenPending;
    }

    public Duration getOtpTtl() {
        return Duration.ofSeconds(otpTtlSeconds);
    }

    public Duration getOtpResendAfter() {
        return Duration.ofSeconds(otpResendAfterSeconds);
    }

    public boolean isWhatsappEnabled() {
        return whatsappEnabled;
    }

    public String getWhatsappToken() {
        return whatsappToken == null ? "" : whatsappToken.trim();
    }

    public String getWhatsappPhoneNumberId() {
        return whatsappPhoneNumberId == null ? "" : whatsappPhoneNumberId.trim();
    }

    // Supabase getters
    public boolean isSupabaseEnabled() {
        return supabaseEnabled && supabaseUrl != null && !supabaseUrl.isBlank() && supabaseKey != null
                && !supabaseKey.isBlank();
    }

    public String getSupabaseUrl() {
        return supabaseUrl == null ? "" : supabaseUrl.trim();
    }

    public String getSupabaseKey() {
        return supabaseKey == null ? "" : supabaseKey.trim();
    }

    public String getSupabaseSchema() {
        return supabaseSchema == null ? "public" : supabaseSchema.trim();
    }

    public String getTableVerification() {
        return tableVerification;
    }

    public String getTablePending() {
        return tablePending;
    }

    public String getTableHistory() {
        return tableHistory;
    }

    public boolean isGoogleMapsEnabled() {
        return googleMapsEnabled;
    }

    public String getGoogleMapsApiKey() {
        return googleMapsApiKey == null ? "" : googleMapsApiKey.trim();
    }

    public boolean isGoogleRoutesTraffic() {
        return googleRoutesTraffic;
    }

    public String getGoogleRoutesFieldMask() {
        return googleRoutesFieldMask == null ? "" : googleRoutesFieldMask.trim();
    }

    public String getWhatsappTemplateName() {
        return whatsappTemplateName == null ? "" : whatsappTemplateName.trim();
    }

    public String getWhatsappLanguage() {
        return whatsappLanguage == null ? "pt_BR" : whatsappLanguage.trim();
    }

    public LocalDate getScheduleCycleStart() {
        String v = (scheduleCycleStart == null) ? "" : scheduleCycleStart.trim();
        if (v.isBlank())
            return null;
        try {
            // esperado: yyyy-MM-dd
            return LocalDate.parse(v);
        } catch (Exception e) {
            // se configurar errado, melhor falhar “soft” e deixar logável
            return null;
        }
    }
}