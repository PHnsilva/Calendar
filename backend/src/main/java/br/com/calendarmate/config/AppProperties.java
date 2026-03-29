package br.com.calendarmate.config;

import br.com.calendarmate.util.LocationNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class AppProperties {

    @Value("${app.zone:America/Sao_Paulo}")
    private String zone;

    @Value("${app.schedule.cycleStart:}")
    private String scheduleCycleStart;

    @Value("${app.schedule.workStart:08:00}")
    private String workStart;

    @Value("${app.schedule.workEnd:18:00}")
    private String workEnd;

    @Value("${app.schedule.lunchStart:12:00}")
    private String lunchStart;

    @Value("${app.schedule.lunchEnd:13:00}")
    private String lunchEnd;

    @Value("${app.service.city:}")
    private String serviceCity;

    @Value("${app.service.state:}")
    private String serviceState;

    @Value("${app.service.allowedCities:}")
    private String allowedCitiesCsv;

    @Value("${app.service.allowedState:}")
    private String allowedState;

    @Value("${app.service.allowedStates:}")
    private String allowedStatesCsv;

    @Value("${app.booking.slotMinutes:60}")
    private int bookingSlotMinutes;

    @Value("${app.booking.allowedMinutes:0}")
    private String bookingAllowedMinutesCsv;

    @Value("${app.booking.maxFutureMonthsAhead:1}")
    private int bookingMaxFutureMonthsAhead;

    @Value("${app.booking.statuses:PENDING_PHONE,CONFIRMED}")
    private String bookingStatusesCsv;

    @Value("${app.pending.ttlMinutes:10}")
    private long pendingTtlMinutes;

    @Value("${app.pending.blockOtherBookings:true}")
    private boolean blockOtherBookingsWhenPending;

    @Value("${app.otp.ttlSeconds:300}")
    private long otpTtlSeconds;

    @Value("${app.otp.resendAfterSeconds:3}")
    private long otpResendAfterSeconds;

    @Value("${app.admin.bulkCancel.maxItems:200}")
    private int adminBulkCancelMaxItems;

    @Value("${whatsapp.enabled:false}")
    private boolean whatsappEnabled;

    @Value("${whatsapp.token:}")
    private String whatsappToken;

    @Value("${whatsapp.phoneNumberId:}")
    private String whatsappPhoneNumberId;

    @Value("${whatsapp.templateName:}")
    private String whatsappTemplateName;

    @Value("${whatsapp.language:pt_BR}")
    private String whatsappLanguage;

    @Value("${supabase.enabled:false}")
    private boolean supabaseEnabled;

    @Value("${supabase.url:}")
    private String supabaseUrl;

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

    @Value("${app.history.retentionMonths:2}")
    private int historyRetentionMonths;

    public int getHistoryRetentionMonths() {
        return Math.max(0, Math.min(historyRetentionMonths, 24));
    }

    public String getZone() {
        String value = zone == null ? "" : zone.trim();
        return value.isBlank() ? "America/Sao_Paulo" : value;
    }

    public ZoneId getZoneId() {
        try {
            return ZoneId.of(getZone());
        } catch (Exception e) {
            return ZoneId.of("America/Sao_Paulo");
        }
    }

    public String getServiceCity() {
        return serviceCity == null ? "" : serviceCity.trim();
    }

    public String getServiceState() {
        return serviceState == null ? "" : serviceState.trim();
    }

    public List<String> getAllowedCitiesDisplay() {
        List<String> csvValues = csvList(allowedCitiesCsv);
        if (!csvValues.isEmpty()) {
            return csvValues;
        }

        String legacy = getServiceCity();
        if (legacy.isBlank()) {
            return Collections.emptyList();
        }
        return Collections.singletonList(legacy);
    }

    public List<String> getAllowedStatesDisplay() {
        List<String> csvValues = csvList(allowedStatesCsv);
        if (!csvValues.isEmpty()) {
            return csvValues;
        }

        String single = allowedState == null ? "" : allowedState.trim();
        if (!single.isBlank()) {
            return Collections.singletonList(single);
        }

        String legacy = getServiceState();
        if (legacy.isBlank()) {
            return Collections.emptyList();
        }
        return Collections.singletonList(legacy);
    }

    public Set<String> getAllowedCitiesNormalized() {
        List<String> source = getAllowedCitiesDisplay();
        if (source.isEmpty()) {
            return Collections.emptySet();
        }

        return source.stream()
                .map(LocationNormalizer::normalizeCity)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public Set<String> getAllowedStatesUpper() {
        List<String> source = getAllowedStatesDisplay();
        if (source.isEmpty()) {
            return Collections.emptySet();
        }

        return source.stream()
                .map(LocationNormalizer::normalizeState)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public String getLegacyCityNormalized() {
        String c = getServiceCity();
        return LocationNormalizer.normalizeCity(c);
    }

    public int getBookingSlotMinutes() {
        return Math.max(15, Math.min(bookingSlotMinutes, 240));
    }

    public Set<Integer> getAllowedMinuteMarks() {
        LinkedHashSet<Integer> out = csvList(bookingAllowedMinutesCsv).stream()
                .map(this::parseMinute)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (out.isEmpty()) {
            out.add(0);
        }

        return Collections.unmodifiableSet(out);
    }

    public List<Integer> getAllowedMinuteMarksList() {
        return new ArrayList<>(getAllowedMinuteMarks());
    }

    public int getBookingMaxFutureMonthsAhead() {
        return Math.max(0, Math.min(bookingMaxFutureMonthsAhead, 12));
    }

    public List<String> getBookingStatuses() {
        List<String> values = csvList(bookingStatusesCsv).stream()
                .map(v -> v.toUpperCase(Locale.ROOT))
                .collect(Collectors.toList());

        if (values.isEmpty()) {
            return List.of("PENDING_PHONE", "CONFIRMED");
        }
        return values;
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

    public int getAdminBulkCancelMaxItems() {
        return Math.max(1, Math.min(adminBulkCancelMaxItems, 1000));
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

    public String getWhatsappTemplateName() {
        return whatsappTemplateName == null ? "" : whatsappTemplateName.trim();
    }

    public String getWhatsappLanguage() {
        return whatsappLanguage == null ? "pt_BR" : whatsappLanguage.trim();
    }

    public boolean isSupabaseEnabled() {
        return supabaseEnabled
                && supabaseUrl != null && !supabaseUrl.isBlank()
                && supabaseKey != null && !supabaseKey.isBlank();
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

    public LocalDate getScheduleCycleStart() {
        String v = (scheduleCycleStart == null) ? "" : scheduleCycleStart.trim();
        if (v.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(v);
        } catch (Exception e) {
            return null;
        }
    }

    public LocalTime getWorkStart() {
        return parseTimeOrDefault(workStart, LocalTime.of(8, 0));
    }

    public LocalTime getWorkEnd() {
        return parseTimeOrDefault(workEnd, LocalTime.of(18, 0));
    }

    public LocalTime getLunchStart() {
        return parseTimeOrDefault(lunchStart, LocalTime.of(12, 0));
    }

    public LocalTime getLunchEnd() {
        return parseTimeOrDefault(lunchEnd, LocalTime.of(13, 0));
    }

    private LocalTime parseTimeOrDefault(String raw, LocalTime def) {
        try {
            String v = raw == null ? "" : raw.trim();
            if (v.isBlank()) {
                return def;
            }
            return LocalTime.parse(v);
        } catch (Exception e) {
            return def;
        }
    }

    private List<String> csvList(String csv) {
        String value = csv == null ? "" : csv.trim();
        if (value.isBlank()) {
            return Collections.emptyList();
        }

        return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    private Integer parseMinute(String value) {
        try {
            int minute = Integer.parseInt(value);
            if (minute < 0 || minute > 59) {
                return null;
            }
            return minute;
        } catch (Exception e) {
            return null;
        }
    }
}
