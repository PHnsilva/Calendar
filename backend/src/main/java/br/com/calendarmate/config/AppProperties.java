package br.com.calendarmate.config;

import br.com.calendarmate.util.LocationNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
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

    @Value("${geoapify.enabled:false}")
    private boolean geoapifyEnabled;

    @Value("${geoapify.apiKey:}")
    private String geoapifyApiKey;

    @Value("${geoapify.routing.mode:drive}")
    private String geoapifyRoutingMode;

    @Value("${geoapify.routing.units:metric}")
    private String geoapifyRoutingUnits;

    @Value("${geoapify.routing.lang:pt-BR}")
    private String geoapifyRoutingLang;

    @Value("${geoapify.geocoding.country:br}")
    private String geoapifyGeocodingCountry;

    @Value("${app.history.retentionMonths:2}")
    private int historyRetentionMonths;

    @Value("${app.booking.defaultDurationMinutes:60}")
    private int bookingDefaultDurationMinutes;

    @Value("${app.booking.durationByCity:}")
    private String bookingDurationByCity;


    public int getBookingSlotMinutes() {
        return 60;
    }

    public List<Integer> getAllowedMinuteMarks() {
        return List.of(0);
    }

    public int getMaxFutureMonthsAhead() {
        return 1;
    }

    public List<String> getAllowedCitiesDisplay() {
        String csv = (allowedCitiesCsv == null ? "" : allowedCitiesCsv.trim());
        if (csv.isBlank()) {
            String legacy = getServiceCity();
            return legacy.isBlank() ? List.of() : List.of(legacy);
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    public List<String> getAllowedStatesDisplay() {
        Set<String> states = getAllowedStatesUpper();
        if (!states.isEmpty()) {
            return new ArrayList<>(states);
        }
        String legacy = getServiceState();
        return legacy.isBlank() ? List.of() : List.of(LocationNormalizer.normalizeState(legacy));
    }

    public int getBookingDefaultDurationMinutes() {
        int value = bookingDefaultDurationMinutes <= 0 ? 60 : bookingDefaultDurationMinutes;
        return normalizeDurationMinutes(value);
    }

    public int getBookingDurationMinutesForCity(String city) {
        String normalizedCity = LocationNormalizer.normalizeCity(city);
        if (normalizedCity.isBlank()) {
            return getBookingDefaultDurationMinutes();
        }
        return getBookingDurationMinutesByCityNormalized().getOrDefault(normalizedCity, getBookingDefaultDurationMinutes());
    }

    public Map<String, Integer> getBookingDurationMinutesByCityDisplay() {
        LinkedHashMap<String, Integer> out = new LinkedHashMap<>();
        for (String city : getAllowedCitiesDisplay()) {
            out.put(city, getBookingDurationMinutesForCity(city));
        }
        getBookingDurationEntries().forEach(entry -> out.putIfAbsent(entry.displayCity(), entry.durationMinutes()));
        return out;
    }

    public int getHistoryRetentionMonths() {
        return Math.max(0, Math.min(historyRetentionMonths, 24));
    }

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


    public boolean isGeoapifyEnabled() {
        return geoapifyEnabled;
    }

    public String getGeoapifyApiKey() {
        return geoapifyApiKey == null ? "" : geoapifyApiKey.trim();
    }

    public String getGeoapifyRoutingMode() {
        return geoapifyRoutingMode == null ? "drive" : geoapifyRoutingMode.trim();
    }

    public String getGeoapifyRoutingUnits() {
        return geoapifyRoutingUnits == null ? "metric" : geoapifyRoutingUnits.trim();
    }

    public String getGeoapifyRoutingLang() {
        return geoapifyRoutingLang == null ? "pt-BR" : geoapifyRoutingLang.trim();
    }

    public String getGeoapifyGeocodingCountry() {
        return geoapifyGeocodingCountry == null ? "br" : geoapifyGeocodingCountry.trim();
    }

    public LocalDate getScheduleCycleStart() {
        String v = (scheduleCycleStart == null) ? "" : scheduleCycleStart.trim();
        if (v.isBlank())
            return null;
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

    private Map<String, Integer> getBookingDurationMinutesByCityNormalized() {
        LinkedHashMap<String, Integer> out = new LinkedHashMap<>();
        for (BookingDurationEntry entry : getBookingDurationEntries()) {
            out.put(LocationNormalizer.normalizeCity(entry.displayCity()), entry.durationMinutes());
        }
        return out;
    }

    private List<BookingDurationEntry> getBookingDurationEntries() {
        String raw = bookingDurationByCity == null ? "" : bookingDurationByCity.trim();
        if (raw.isBlank()) {
            return List.of();
        }

        List<BookingDurationEntry> out = new ArrayList<>();
        for (String token : raw.split(";")) {
            String entry = token == null ? "" : token.trim();
            if (entry.isBlank()) {
                continue;
            }

            String[] parts = entry.split(":", 2);
            if (parts.length != 2) {
                continue;
            }

            String city = parts[0].trim();
            String minutesRaw = parts[1].trim();
            if (city.isBlank() || minutesRaw.isBlank()) {
                continue;
            }

            try {
                int duration = normalizeDurationMinutes(Integer.parseInt(minutesRaw));
                out.add(new BookingDurationEntry(city, duration));
            } catch (Exception ignored) {
            }
        }
        return out;
    }

    private int normalizeDurationMinutes(int minutes) {
        int safe = Math.max(60, minutes);
        int remainder = safe % 60;
        return remainder == 0 ? safe : safe + (60 - remainder);
    }

    private LocalTime parseTimeOrDefault(String raw, LocalTime def) {
        try {
            String v = raw == null ? "" : raw.trim();
            if (v.isBlank())
                return def;
            return LocalTime.parse(v);
        } catch (Exception e) {
            return def;
        }
    }

    private record BookingDurationEntry(String displayCity, int durationMinutes) {
    }
}
