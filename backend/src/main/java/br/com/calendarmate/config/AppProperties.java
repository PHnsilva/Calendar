package br.com.calendarmate.config;

import br.com.calendarmate.util.LocationNormalizer;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Configuration
public class AppProperties {
    private static final List<String> DEFAULT_SERVICE_TYPES = List.of(
            "Montagem",
            "Elétrica",
            "Hidráulica",
            "Instalações",
            "Pequenos reparos",
            "Serviços de pedreiro",
            "Pintura",
            "Jardinagem",
            "Serviços com drone",
            "Orçamento");

    @Value("${app.zone:America/Sao_Paulo}")
    private String zone;

    @Value("${app.schedule.cycleStart:2026-05-16}")
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

    @Value("${app.service.types:}")
    private String serviceTypes;

    @Value("${app.booking.durationByCity:}")
    private String bookingDurationByCityCsv;

    @Value("${app.booking.baseCity:Itabirito}")
    private String bookingBaseCity = "Itabirito";

    @Value("${app.booking.minLeadHours:24}")
    private long bookingMinLeadHours = 24;

    @Value("${app.booking.distant.blockBeforeHours:2}")
    private int distantBookingBlockBeforeHours = 2;

    @Value("${app.booking.distant.blockAfterHours:3}")
    private int distantBookingBlockAfterHours = 3;

    @Value("${app.booking.distant.emptyDayStartDelayHours:3}")
    private int distantBookingEmptyDayStartDelayHours = 3;

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

    @Value("${app.admin.session.ttlDays:${ADMIN_SESSION_TTL_DAYS:7}}")
    private long adminSessionTtlDays;

    @Value("${app.admin.tempPassword:${ADMIN_TEMP_PASSWORD:#052430Vs}}")
    private String adminTempPassword;

    @Value("${app.admin.users:${ADMIN_USERS:}}")
    private String adminUsersCsv;

    @Value("${app.admin.booking.activePastDays:${ADMIN_BOOKING_ACTIVE_PAST_DAYS:10}}")
    private int adminBookingActivePastDays = 10;

    @Value("${app.admin.booking.maxFutureMonthsAhead:${ADMIN_BOOKING_MAX_FUTURE_MONTHS_AHEAD:6}}")
    private int adminBookingMaxFutureMonthsAhead = 6;

    @Value("${app.debug.otpCode:${DEBUG_OTP_CODE:false}}")
    private boolean debugOtpCode;

    @Value("${app.debug.devAdminEnabled:${DEBUG_ADMIN_ENABLED:true}}")
    private boolean debugDevAdminEnabled;

    @Value("${app.debug.devAdminPhone:${DEBUG_ADMIN_PHONE:31995438467}}")
    private String debugDevAdminPhone;

    @Value("${app.debug.devAdminName:${DEBUG_ADMIN_NAME:Admin Debug}}")
    private String debugDevAdminName;

    @Value("${app.debug.devAdminRole:${DEBUG_ADMIN_ROLE:OWNER}}")
    private String debugDevAdminRole;

    @Value("${spring.profiles.active:${SPRING_PROFILES_ACTIVE:}}")
    private String springProfilesActive;

    @Value("${app.env:${APP_ENV:}}")
    private String appEnv;

    @Value("${frontend.url:${FRONTEND_URL:}}")
    private String frontendUrl;

    @Value("${app.publicDomain:${APP_PUBLIC_DOMAIN:calendar-mate.vercel.app}}")
    private String publicDomain;

    @Value("${verification.channel:${VERIFICATION_CHANNEL:DUMMY}}")
    private String verificationChannel;

    @Value("${sms.notificationapi.enabled:${SMS_NOTIFICATIONAPI_ENABLED:false}}")
    private boolean smsNotificationApiEnabled;

    @Value("${sms.notificationapi.apiKey:${SMS_NOTIFICATIONAPI_API_KEY:}}")
    private String smsNotificationApiKey;

    @Value("${sms.notificationapi.baseUrl:${SMS_NOTIFICATIONAPI_BASE_URL:https://api.pingram.io}}")
    private String smsNotificationApiBaseUrl;

    @Value("${sms.notificationapi.type:${SMS_NOTIFICATIONAPI_TYPE:calendar_mate_otp}}")
    private String smsNotificationApiType;

    @Value("${sms.notificationapi.monthlyLimit:${SMS_NOTIFICATIONAPI_MONTHLY_LIMIT:100}}")
    private int smsNotificationApiMonthlyLimit;

    @Value("${sms.notificationapi.usageFile:${SMS_NOTIFICATIONAPI_USAGE_FILE:/tmp/calendarmate-sms-usage.properties}}")
    private String smsNotificationApiUsageFile;

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

    @Value("${supabase.table.admin_users:${SUPABASE_TABLE_ADMIN_USERS:admin_users}}")
    private String tableAdminUsers;

    @Value("${supabase.table.admin_sessions:${SUPABASE_TABLE_ADMIN_SESSIONS:admin_sessions}}")
    private String tableAdminSessions;

    @Value("${supabase.table.booking_history_records:${SUPABASE_TABLE_BOOKING_HISTORY_RECORDS:booking_history_records}}")
    private String tableBookingHistory;

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

    @Value("${app.history.retentionMonths:${APP_HISTORY_RETENTION_MONTHS:2.0}}")
    private String historyRetentionMonths;

    public int getBookingSlotMinutes() { return 60; }

    public List<Integer> getAllowedMinuteMarks() { return List.of(0); }

    public int getMaxFutureMonthsAhead() { return 1; }

    public List<String> getAllowedCitiesDisplay() {
        String csv = allowedCitiesCsv == null ? "" : allowedCitiesCsv.trim();
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

    public Map<String, Integer> getBookingDurationByCityDisplay() {
        LinkedHashMap<String, Integer> parsed = new LinkedHashMap<>();
        String raw = bookingDurationByCityCsv == null ? "" : bookingDurationByCityCsv.trim();
        if (!raw.isBlank()) {
            for (String entry : raw.split(",")) {
                String item = entry == null ? "" : entry.trim();
                if (item.isBlank() || !item.contains("=")) {
                    continue;
                }
                String[] parts = item.split("=", 2);
                String city = parts[0].trim();
                String value = parts[1].trim();
                if (city.isBlank() || value.isBlank()) {
                    continue;
                }
                try {
                    int minutes = Integer.parseInt(value);
                    if (minutes > 0) {
                        parsed.put(city, minutes);
                    }
                } catch (NumberFormatException ignored) {
                }
            }
        }
        if (parsed.isEmpty()) {
            for (String city : getAllowedCitiesDisplay()) {
                parsed.put(city, 60);
            }
        }
        return parsed;
    }

    public int getBookingDurationMinutesForCity(String city) {
        if (city == null || city.isBlank()) {
            return 60;
        }
        String normalized = LocationNormalizer.normalizeCity(city);
        for (Map.Entry<String, Integer> entry : getBookingDurationByCityDisplay().entrySet()) {
            if (LocationNormalizer.normalizeCity(entry.getKey()).equals(normalized)) {
                return Math.max(60, entry.getValue());
            }
        }
        return 60;
    }

    public List<String> getServiceTypesDisplay() {
        String configured = serviceTypes == null ? "" : serviceTypes.trim();
        if (configured.isBlank()) {
            return DEFAULT_SERVICE_TYPES;
        }
        List<String> parsed = Arrays.stream(configured.split("\\|"))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .collect(Collectors.toList());
        return parsed.isEmpty() ? DEFAULT_SERVICE_TYPES : parsed;
    }

    public String getBookingBaseCity() { return cleanOrDefault(bookingBaseCity, "Itabirito"); }
    public String getBookingBaseCityNormalized() { return LocationNormalizer.normalizeCity(getBookingBaseCity()); }
    public boolean isDistantBookingCity(String city) {
        String normalized = LocationNormalizer.normalizeCity(city);
        return !normalized.isBlank() && !normalized.equals(getBookingBaseCityNormalized());
    }
    public Duration getBookingMinLeadTime() { return Duration.ofHours(Math.max(1, Math.min(bookingMinLeadHours, 168))); }
    public int getDistantBookingBlockBeforeMinutes() {
        return Math.max(0, Math.min(distantBookingBlockBeforeHours, 12)) * 60;
    }
    public int getDistantBookingBlockAfterMinutes() {
        return Math.max(1, Math.min(distantBookingBlockAfterHours, 12)) * 60;
    }
    public int getDistantBookingEmptyDayStartDelayMinutes() {
        return Math.max(0, Math.min(distantBookingEmptyDayStartDelayHours, 12)) * 60;
    }

    public int getHistoryRetentionMonths() { return (int) Math.ceil(getHistoryRetentionMonthsValue()); }
    public double getHistoryRetentionMonthsValue() {
        try {
            double parsed = Double.parseDouble(historyRetentionMonths == null ? "2.0" : historyRetentionMonths.trim().replace(",", "."));
            return Math.max(0D, Math.min(parsed, 24D));
        } catch (Exception e) {
            return 2D;
        }
    }
    public int getHistoryRetentionDays() { return (int) Math.ceil(getHistoryRetentionMonthsValue() * 31D); }
    public String getZone() { return zone; }
    public String getServiceCity() { return serviceCity == null ? "" : serviceCity.trim(); }
    public String getServiceState() { return serviceState == null ? "" : serviceState.trim(); }

    public Set<String> getAllowedCitiesNormalized() {
        String csv = allowedCitiesCsv == null ? "" : allowedCitiesCsv.trim();
        if (csv.isBlank()) return Collections.emptySet();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(LocationNormalizer::normalizeCity)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    public Set<String> getAllowedStatesUpper() {
        String csv = allowedStatesCsv == null ? "" : allowedStatesCsv.trim();
        String single = allowedState == null ? "" : allowedState.trim();
        String legacy = serviceState == null ? "" : serviceState.trim();
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
        return LocationNormalizer.normalizeCity(getServiceCity());
    }

    public Duration getPendingTtl() { return Duration.ofMinutes(pendingTtlMinutes); }
    public boolean isBlockOtherBookingsWhenPending() { return blockOtherBookingsWhenPending; }
    public Duration getOtpTtl() { return Duration.ofSeconds(otpTtlSeconds); }
    public Duration getOtpResendAfter() { return Duration.ofSeconds(otpResendAfterSeconds); }
    public int getAdminBulkCancelMaxItems() { return Math.max(1, Math.min(adminBulkCancelMaxItems, 1000)); }
    public Duration getAdminSessionTtl() { return Duration.ofDays(Math.max(1, Math.min(adminSessionTtlDays, 30))); }
    public String getAdminTempPassword() { return cleanOrDefault(adminTempPassword, "#052430Vs"); }
    public String getAdminUsersCsv() {
        return mergeAdminUserSeeds(
                AdminUserRegistryDefaults.DEFAULT_SEED,
                adminUsersCsv,
                buildDebugAdminSeedEntry());
    }
    public int getAdminBookingActivePastDays() { return Math.max(0, Math.min(adminBookingActivePastDays, 90)); }
    public int getAdminBookingMaxFutureMonthsAhead() { return Math.max(1, Math.min(adminBookingMaxFutureMonthsAhead, 24)); }

    public String getFrontendUrl() { return frontendUrl == null ? "" : frontendUrl.trim(); }
    public String getPublicDomain() { return cleanOrDefault(publicDomain, "calendar-mate.vercel.app"); }
    public String getVerificationChannel() { return verificationChannel == null ? "DUMMY" : verificationChannel.trim().toUpperCase(Locale.ROOT); }
    public boolean isSmsNotificationApiEnabled() { return smsNotificationApiEnabled; }
    public String getSmsNotificationApiApiKey() { return clean(smsNotificationApiKey); }
    public String getSmsNotificationApiBaseUrl() { return cleanOrDefault(smsNotificationApiBaseUrl, "https://api.pingram.io"); }
    public String getSmsNotificationApiType() { return cleanOrDefault(smsNotificationApiType, "calendar_mate_otp"); }
    public int getSmsNotificationApiMonthlyLimit() { return Math.max(0, smsNotificationApiMonthlyLimit); }
    public String getSmsNotificationApiUsageFile() { return cleanOrDefault(smsNotificationApiUsageFile, "/tmp/calendarmate-sms-usage.properties"); }

    public boolean isSmsNotificationApiReady() {
        return isSmsNotificationApiEnabled()
                && !getSmsNotificationApiApiKey().isBlank()
                && !getSmsNotificationApiType().isBlank();
    }

    public boolean isWhatsappEnabled() { return whatsappEnabled; }
    public String getWhatsappToken() { return whatsappToken == null ? "" : whatsappToken.trim(); }
    public String getWhatsappPhoneNumberId() { return whatsappPhoneNumberId == null ? "" : whatsappPhoneNumberId.trim(); }
    public String getWhatsappTemplateName() { return whatsappTemplateName == null ? "" : whatsappTemplateName.trim(); }
    public String getWhatsappLanguage() { return whatsappLanguage == null ? "pt_BR" : whatsappLanguage.trim(); }

    public boolean isSupabaseEnabled() {
        return supabaseEnabled && supabaseUrl != null && !supabaseUrl.isBlank() && supabaseKey != null && !supabaseKey.isBlank();
    }

    public String getSupabaseUrl() { return supabaseUrl == null ? "" : supabaseUrl.trim(); }
    public String getSupabaseKey() { return supabaseKey == null ? "" : supabaseKey.trim(); }
    public String getSupabaseSchema() { return supabaseSchema == null ? "public" : supabaseSchema.trim(); }
    public String getTableVerification() { return tableVerification; }
    public String getTablePending() { return tablePending; }
    public String getTableHistory() { return tableHistory; }
    public String getTableAdminUsers() { return cleanOrDefault(tableAdminUsers, "admin_users"); }
    public String getTableAdminSessions() { return cleanOrDefault(tableAdminSessions, "admin_sessions"); }
    public String getTableBookingHistory() { return cleanOrDefault(tableBookingHistory, "booking_history_records"); }
    public boolean isGoogleMapsEnabled() { return googleMapsEnabled; }
    public String getGoogleMapsApiKey() { return googleMapsApiKey == null ? "" : googleMapsApiKey.trim(); }
    public boolean isGoogleRoutesTraffic() { return googleRoutesTraffic; }
    public String getGoogleRoutesFieldMask() { return googleRoutesFieldMask == null ? "" : googleRoutesFieldMask.trim(); }
    public boolean isGeoapifyEnabled() { return geoapifyEnabled; }
    public String getGeoapifyApiKey() { return geoapifyApiKey == null ? "" : geoapifyApiKey.trim(); }
    public String getGeoapifyRoutingMode() { return geoapifyRoutingMode == null ? "drive" : geoapifyRoutingMode.trim(); }
    public String getGeoapifyRoutingUnits() { return geoapifyRoutingUnits == null ? "metric" : geoapifyRoutingUnits.trim(); }
    public String getGeoapifyRoutingLang() { return geoapifyRoutingLang == null ? "pt-BR" : geoapifyRoutingLang.trim(); }
    public String getGeoapifyGeocodingCountry() { return geoapifyGeocodingCountry == null ? "br" : geoapifyGeocodingCountry.trim(); }

    public LocalDate getScheduleCycleStart() {
        String v = scheduleCycleStart == null ? "" : scheduleCycleStart.trim();
        if (v.isBlank()) return null;
        try { return LocalDate.parse(v); } catch (Exception e) { return null; }
    }

    public LocalTime getWorkStart() { return parseTimeOrDefault(workStart, LocalTime.of(8, 0)); }
    public LocalTime getWorkEnd() { return parseTimeOrDefault(workEnd, LocalTime.of(18, 0)); }
    public LocalTime getLunchStart() { return parseTimeOrDefault(lunchStart, LocalTime.of(12, 0)); }
    public LocalTime getLunchEnd() { return parseTimeOrDefault(lunchEnd, LocalTime.of(13, 0)); }

    private LocalTime parseTimeOrDefault(String raw, LocalTime def) {
        try {
            String v = raw == null ? "" : raw.trim();
            if (v.isBlank()) return def;
            return LocalTime.parse(v);
        } catch (Exception e) {
            return def;
        }
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private String cleanOrDefault(String value, String fallback) {
        String cleaned = clean(value);
        return cleaned.isBlank() ? fallback : cleaned;
    }

    public boolean isOtpDebugLoggingEnabled() {
        return debugOtpCode && isLocalDebugProfile();
    }

    private String buildDebugAdminSeedEntry() {
        if (!debugDevAdminEnabled || !isLocalDebugProfile()) {
            return "";
        }
        String phone = clean(debugDevAdminPhone);
        if (phone.isBlank()) {
            return "";
        }
        String name = cleanOrDefault(debugDevAdminName, "Admin Debug");
        String role = cleanOrDefault(debugDevAdminRole, "OWNER").toUpperCase(Locale.ROOT);
        return phone + "|" + name + "|" + role;
    }

    private String mergeAdminUserSeeds(String... configs) {
        List<AdminUserSeedEntry> entries = new ArrayList<>();
        for (String config : configs) {
            for (String rawEntry : splitAdminUserSeedEntries(config)) {
                AdminUserSeedEntry entry = AdminUserSeedEntry.from(rawEntry);
                if (entry == null) {
                    continue;
                }
                entries.removeIf(existing -> existing.conflictsWith(entry));
                entries.add(entry);
            }
        }
        return entries.stream()
                .map(AdminUserSeedEntry::raw)
                .collect(Collectors.joining(";"));
    }

    private List<String> splitAdminUserSeedEntries(String config) {
        String raw = clean(config);
        if (raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(";"))
                .map(String::trim)
                .filter(entry -> !entry.isBlank())
                .toList();
    }

    private record AdminUserSeedEntry(String raw, String phone, String id) {
        static AdminUserSeedEntry from(String raw) {
            String[] parts = raw.split("\\|");
            String phone = parts.length > 0 ? PhoneNumberNormalizer.normalizeBrazilianPhoneOrBlank(parts[0]) : "";
            if (phone.isBlank()) {
                return null;
            }
            String id = parts.length > 3 ? parts[3].trim() : "";
            return new AdminUserSeedEntry(raw.trim(), phone, id);
        }

        boolean conflictsWith(AdminUserSeedEntry other) {
            return phone.equals(other.phone) || (!id.isBlank() && id.equals(other.id));
        }
    }

    private boolean isLocalDebugProfile() {
        String merged = (clean(springProfilesActive) + "," + clean(appEnv)).toLowerCase(Locale.ROOT);
        List<String> profiles = Arrays.stream(merged.split("[,;\\s]+"))
                .map(String::trim)
                .filter(token -> !token.isBlank())
                .toList();
        if (!profiles.isEmpty()) {
            return profiles.stream()
                    .anyMatch(token -> token.equals("local") || token.equals("dev") || token.equals("development") || token.equals("test"));
        }
        return isDefaultLocalDebugConfiguration();
    }

    private boolean isDefaultLocalDebugConfiguration() {
        boolean dummyVerification = "DUMMY".equalsIgnoreCase(getVerificationChannel());
        boolean frontendLooksLocal = getFrontendUrl().isBlank()
                || containsLocalhost(getFrontendUrl())
                || containsLocalhost(getPublicDomain());
        return dummyVerification && frontendLooksLocal && !isSupabaseEnabled();
    }

    private boolean containsLocalhost(String value) {
        String normalized = clean(value).toLowerCase(Locale.ROOT);
        return normalized.contains("localhost") || normalized.contains("127.0.0.1");
    }
}
