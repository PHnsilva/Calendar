package br.com.calendarmate.config;

import br.com.calendarmate.google.CalendarClient;
import br.com.calendarmate.integrations.DummyWhatsAppClient;
import br.com.calendarmate.integrations.MetaWhatsAppClient;
import br.com.calendarmate.integrations.MisconfiguredOtpDeliveryClient;
import br.com.calendarmate.integrations.MonthlySmsQuota;
import br.com.calendarmate.integrations.NotificationApiSmsClient;
import br.com.calendarmate.integrations.OtpDeliveryClient;
import br.com.calendarmate.integrations.geoapify.GeoapifyRoutesClient;
import br.com.calendarmate.integrations.google.GoogleRoutesClient;
import br.com.calendarmate.integrations.routes.RouteClient;
import br.com.calendarmate.integrations.supabase.SupabaseClient;
import br.com.calendarmate.service.*;
import br.com.calendarmate.service.store.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Configuration
public class AppConfig {
    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);

    @Bean
    public TokenUtil tokenUtil() {
        String secret = System.getenv().getOrDefault("HMAC_SECRET", "dev-secret");
        long ttl = 7L * 24L * 3600L;
        return new TokenUtil(secret, ttl);
    }

    @Bean
    public RestTemplate restTemplate() {
        int connectTimeoutMs = positiveIntEnv("HTTP_CONNECT_TIMEOUT_MS", 5000);
        int readTimeoutMs = positiveIntEnv("HTTP_READ_TIMEOUT_MS", 15000);

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(connectTimeoutMs);
        factory.setReadTimeout(readTimeoutMs);

        log.info("HTTP client configured connectTimeoutMs={} readTimeoutMs={}", connectTimeoutMs, readTimeoutMs);
        return new RestTemplate(factory);
    }

    private int positiveIntEnv(String name, int fallback) {
        String raw = System.getenv(name);
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        try {
            int value = Integer.parseInt(raw.trim());
            return value > 0 ? value : fallback;
        } catch (NumberFormatException ex) {
            log.warn("Ignoring invalid integer environment variable name={} value=invalid", name);
            return fallback;
        }
    }

    @Bean
    public OtpDeliveryClient otpDeliveryClient(RestTemplate http, AppProperties props) {
        String channel = props.getVerificationChannel();
        log.info("Verification provider selection channel={}", channel);

        if ("SMS".equals(channel)) {
            if (props.isSmsNotificationApiReady()) {
                log.info(
                        "Verification provider configured provider=NotificationAPI channel=SMS baseHostPath={} typePresent={} monthlyLimit={}",
                        safeHostPath(props.getSmsNotificationApiBaseUrl()),
                        !props.getSmsNotificationApiType().isBlank(),
                        props.getSmsNotificationApiMonthlyLimit());
                MonthlySmsQuota quota = new MonthlySmsQuota(
                        props.getSmsNotificationApiMonthlyLimit(),
                        props.getSmsNotificationApiUsageFile());
                return new NotificationApiSmsClient(
                        props.getSmsNotificationApiApiKey(),
                        props.getSmsNotificationApiBaseUrl(),
                        props.getSmsNotificationApiType(),
                        quota,
                        props.getPublicDomain());
            }

            List<String> missing = missingSmsNotificationApiConfig(props);
            if (!missing.isEmpty()) {
                log.warn(
                        "Verification provider configuration incomplete provider=NotificationAPI missing={}",
                        String.join(",", missing));
                return new MisconfiguredOtpDeliveryClient(
                        "NotificationAPI",
                        "Provedor de verificacao SMS nao configurado.",
                        String.join(",", missing));
            }

            return new MisconfiguredOtpDeliveryClient(
                    "SMS via NotificationAPI não está configurado corretamente.");
        }

        if ("META".equals(channel) || "WHATSAPP".equals(channel)) {
            if (props.isWhatsappEnabled()
                    && !props.getWhatsappToken().isBlank()
                    && !props.getWhatsappPhoneNumberId().isBlank()
                    && !props.getWhatsappTemplateName().isBlank()) {
                return new MetaWhatsAppClient(
                        http,
                        props.getWhatsappToken(),
                        props.getWhatsappPhoneNumberId(),
                        props.getWhatsappTemplateName(),
                        props.getWhatsappLanguage());
            }

            log.warn(
                    "Verification provider configuration incomplete provider=MetaWhatsApp missing={}",
                    String.join(",", missingWhatsappConfig(props)));
            return new MisconfiguredOtpDeliveryClient(
                    "MetaWhatsApp",
                    "Provedor de verificacao WhatsApp nao configurado.",
                    String.join(",", missingWhatsappConfig(props)));
        }

        log.info("Verification provider configured provider=Dummy channel={}", channel);
        return new DummyWhatsAppClient();
    }

    private List<String> missingSmsNotificationApiConfig(AppProperties props) {
        List<String> missing = new ArrayList<>();
        if (!props.isSmsNotificationApiEnabled()) {
            missing.add("SMS_NOTIFICATIONAPI_ENABLED");
        }
        if (props.getSmsNotificationApiApiKey().isBlank()) {
            missing.add("SMS_NOTIFICATIONAPI_API_KEY");
        }
        if (props.getSmsNotificationApiType().isBlank()) {
            missing.add("SMS_NOTIFICATIONAPI_TYPE");
        }
        return missing;
    }

    private List<String> missingWhatsappConfig(AppProperties props) {
        List<String> missing = new ArrayList<>();
        if (!props.isWhatsappEnabled()) {
            missing.add("WHATSAPP_ENABLED");
        }
        if (props.getWhatsappToken().isBlank()) {
            missing.add("WHATSAPP_TOKEN");
        }
        if (props.getWhatsappPhoneNumberId().isBlank()) {
            missing.add("WHATSAPP_PHONE_NUMBER_ID");
        }
        if (props.getWhatsappTemplateName().isBlank()) {
            missing.add("WHATSAPP_TEMPLATE_NAME");
        }
        return missing;
    }

    private String safeHostPath(String rawUrl) {
        try {
            java.net.URI uri = java.net.URI.create(rawUrl == null || rawUrl.isBlank() ? "" : rawUrl.trim());
            String host = uri.getHost() == null ? "unknown-host" : uri.getHost();
            String path = uri.getPath() == null || uri.getPath().isBlank() ? "/" : uri.getPath();
            return host + path;
        } catch (Exception ex) {
            return "invalid-url";
        }
    }

    @Bean
    public InMemoryVerificationStore inMemoryVerificationStore() {
        return new InMemoryVerificationStore();
    }

    @Bean
    public InMemoryPendingStore inMemoryPendingStore() {
        return new InMemoryPendingStore();
    }

    @Bean
    public InMemoryHistoryStore inMemoryHistoryStore() {
        return new InMemoryHistoryStore();
    }

    @Bean
    public InMemoryAdminUserStore inMemoryAdminUserStore(AppProperties props) {
        return new InMemoryAdminUserStore(props.getAdminUsersCsv());
    }

    @Bean
    public InMemoryAdminSessionStore inMemoryAdminSessionStore() {
        return new InMemoryAdminSessionStore();
    }

    @Bean
    public InMemoryBookingHistoryStore inMemoryBookingHistoryStore() {
        return new InMemoryBookingHistoryStore();
    }

    @Bean
    @ConditionalOnProperty(name = "supabase.enabled", havingValue = "true")
    public SupabaseClient supabaseClient(RestTemplate http, AppProperties props) {
        return new SupabaseClient(http, props.getSupabaseUrl(), props.getSupabaseKey(), props.getSupabaseSchema());
    }

    @Bean
    public VerificationStore verificationStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryVerificationStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabaseVerificationStore(sb, props.getTableVerification());
        }
        return mem;
    }

    @Bean
    public PendingStore pendingStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryPendingStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabasePendingStore(sb, props.getTablePending());
        }
        return mem;
    }

    @Bean
    public HistoryStore historyStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryHistoryStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabaseHistoryStore(sb, props.getTableHistory());
        }
        return mem;
    }

    @Bean
    public AdminUserStore adminUserStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryAdminUserStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabaseAdminUserStore(sb, props.getTableAdminUsers(), props.getAdminUsersCsv());
        }
        return mem;
    }

    @Bean
    public AdminSessionStore adminSessionStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryAdminSessionStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabaseAdminSessionStore(sb, props.getTableAdminSessions());
        }
        return mem;
    }

    @Bean
    public BookingHistoryStore bookingHistoryStore(
            AppProperties props,
            ObjectProvider<SupabaseClient> supabaseClientProvider,
            InMemoryBookingHistoryStore mem) {
        SupabaseClient sb = supabaseClientProvider.getIfAvailable();
        if (props.isSupabaseEnabled() && sb != null) {
            return new SupabaseBookingHistoryStore(sb, props.getTableBookingHistory());
        }
        return mem;
    }

    @Bean
    public AdminAuthService adminAuthService(
            AdminUserStore adminUserStore,
            AdminSessionStore adminSessionStore,
            VerificationStore verificationStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props) {
        return new AdminAuthService(
                adminUserStore,
                adminSessionStore,
                verificationStore,
                otpDeliveryClient,
                props);
    }

    @Bean
    public ServicoService servicoService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService,
            AdminAuthService adminAuthService,
            BookingHistoryStore bookingHistoryStore) {
        return new ServicoService(
                calendarClient,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                availabilityPolicyService,
                adminAuthService,
                bookingHistoryStore);
    }

    @Bean
    public VerificationService verificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationStore verificationStore,
            PendingStore pendingStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props,
            AdminAuthService adminAuthService) {
        return new VerificationService(
                calendarClient,
                tokenUtil,
                verificationStore,
                pendingStore,
                otpDeliveryClient,
                props,
                adminAuthService);
    }

    @Bean
    public RecoveryService recoveryService(
            VerificationStore verificationStore,
            HistoryStore historyStore,
            OtpDeliveryClient otpDeliveryClient,
            AppProperties props,
            ServicoService servicoService,
            TokenUtil tokenUtil,
            AdminAuthService adminAuthService) {
        return new RecoveryService(
                verificationStore,
                historyStore,
                otpDeliveryClient,
                props,
                servicoService,
                tokenUtil,
                adminAuthService);
    }

    @Bean
    public CepService cepService(RestTemplate restTemplate, AppProperties props) {
        return new CepService(restTemplate, props);
    }

    @Bean
    public AddressAutocompleteService addressAutocompleteService(RestTemplate restTemplate, AppProperties props) {
        return new AddressAutocompleteService(restTemplate, props);
    }

    @Bean
    public InternalCleanupService internalCleanupService(
            CalendarClient calendarClient,
            PendingStore pendingStore,
            VerificationStore verificationStore,
            HistoryStore historyStore,
            BookingHistoryStore bookingHistoryStore,
            AppProperties props) {
        return new InternalCleanupService(
                calendarClient,
                pendingStore,
                verificationStore,
                historyStore,
                bookingHistoryStore,
                props);
    }

    @Bean
    public GoogleRoutesClient googleRoutesClient(RestTemplate http, AppProperties props) {
        String key = props.getGoogleMapsApiKey();
        return new GoogleRoutesClient(http, key, props.getGoogleRoutesFieldMask(), props.isGoogleRoutesTraffic());
    }

    @Bean
    public GeoapifyRoutesClient geoapifyRoutesClient(RestTemplate http, AppProperties props) {
        return new GeoapifyRoutesClient(
                http,
                props.getGeoapifyApiKey(),
                props.getGeoapifyRoutingMode(),
                props.getGeoapifyRoutingUnits(),
                props.getGeoapifyRoutingLang(),
                props.getGeoapifyGeocodingCountry());
    }

    @Bean
    public RouteClient routeClient(
            AppProperties props,
            GeoapifyRoutesClient geoapifyRoutesClient,
            GoogleRoutesClient googleRoutesClient) {
        if (props.isGeoapifyEnabled() && !props.getGeoapifyApiKey().isBlank()) {
            return geoapifyRoutesClient;
        }
        return googleRoutesClient;
    }

    @Bean
    public RoutesService routesService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            RouteClient routeClient,
            AppProperties props) {
        boolean enabled = (props.isGeoapifyEnabled() && !props.getGeoapifyApiKey().isBlank())
                || (props.isGoogleMapsEnabled() && !props.getGoogleMapsApiKey().isBlank());
        return new RoutesService(calendarClient, tokenUtil, routeClient, enabled);
    }
}
