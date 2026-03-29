package com.example.Calendar.config;

import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.integrations.DummyWhatsAppClient;
import com.example.Calendar.integrations.MetaWhatsAppClient;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.integrations.google.GoogleRoutesClient;
import com.example.Calendar.integrations.supabase.SupabaseClient;
import com.example.Calendar.service.*;
import com.example.Calendar.service.store.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class AppConfig {

    @Bean
    public TokenUtil tokenUtil() {
        String secret = System.getenv().getOrDefault("HMAC_SECRET", "dev-secret");
        long ttl = 7L * 24L * 3600L;
        return new TokenUtil(secret, ttl);
    }

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean
    public WhatsAppClient whatsAppClient(RestTemplate http, AppProperties props) {
        if (!props.isWhatsappEnabled()) {
            return new DummyWhatsAppClient();
        }

        if (props.getWhatsappToken().isBlank()
                || props.getWhatsappPhoneNumberId().isBlank()
                || props.getWhatsappTemplateName().isBlank()) {
            return new DummyWhatsAppClient();
        }

        return new MetaWhatsAppClient(
                http,
                props.getWhatsappToken(),
                props.getWhatsappPhoneNumberId(),
                props.getWhatsappTemplateName(),
                props.getWhatsappLanguage());
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
    public ServicoService servicoService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            PendingStore pendingStore,
            AppProperties props,
            AvailabilityPolicyService availabilityPolicyService) {
        return new ServicoService(
                calendarClient,
                tokenUtil,
                verificationService,
                pendingStore,
                props,
                availabilityPolicyService);
    }

    @Bean
    public VerificationService verificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationStore verificationStore,
            PendingStore pendingStore,
            WhatsAppClient whatsAppClient,
            AppProperties props) {
        return new VerificationService(
                calendarClient,
                tokenUtil,
                verificationStore,
                pendingStore,
                whatsAppClient,
                props);
    }

    @Bean
    public RecoveryService recoveryService(
            VerificationStore verificationStore,
            HistoryStore historyStore,
            WhatsAppClient whatsAppClient,
            AppProperties props,
            ServicoService servicoService,
            TokenUtil tokenUtil) {
        return new RecoveryService(
                verificationStore,
                historyStore,
                whatsAppClient,
                props,
                servicoService,
                tokenUtil);
    }

    @Bean
    public CepService cepService(RestTemplate restTemplate, AppProperties props) {
        return new CepService(restTemplate, props);
    }

    @Bean
    public InternalCleanupService internalCleanupService(
            CalendarClient calendarClient,
            PendingStore pendingStore,
            VerificationStore verificationStore,
            HistoryStore historyStore,
            AppProperties props) {
        return new InternalCleanupService(
                calendarClient,
                pendingStore,
                verificationStore,
                historyStore,
                props);
    }

    @Bean
    public GoogleRoutesClient googleRoutesClient(RestTemplate http, AppProperties props) {
        String key = props.getGoogleMapsApiKey();
        return new GoogleRoutesClient(http, key, props.getGoogleRoutesFieldMask(), props.isGoogleRoutesTraffic());
    }

    @Bean
    public RoutesService routesService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            GoogleRoutesClient googleRoutesClient,
            AppProperties props) {
        boolean enabled = props.isGoogleMapsEnabled() && !props.getGoogleMapsApiKey().isBlank();
        return new RoutesService(calendarClient, tokenUtil, googleRoutesClient, enabled);
    }
}
