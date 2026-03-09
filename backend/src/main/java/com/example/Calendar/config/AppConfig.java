package com.example.Calendar.config;

import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.integrations.DummyWhatsAppClient;
import com.example.Calendar.integrations.MetaWhatsAppClient;
import com.example.Calendar.integrations.WhatsAppClient;
import com.example.Calendar.integrations.supabase.SupabaseClient;
import com.example.Calendar.service.*;
import com.example.Calendar.service.store.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import com.example.Calendar.integrations.google.GoogleRoutesClient;
import com.example.Calendar.service.RoutesService;

@Configuration
public class AppConfig {

    // ===== util =====

    @Bean
    public TokenUtil tokenUtil() {
        String secret = System.getenv().getOrDefault("HMAC_SECRET", "dev-secret");
        long ttl = 7L * 24L * 3600L; // 7 dias
        return new TokenUtil(secret, ttl);
    }

    // ===== HTTP clients =====

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    // ===== WhatsApp =====

@Bean
public WhatsAppClient whatsAppClient(RestTemplate http, AppProperties props) {
    if (!props.isWhatsappEnabled()) {
        return new DummyWhatsAppClient();
    }

    // Fail-soft aqui (pra não quebrar dev): se faltar config, ainda usa dummy
    // Se quiser fail-fast em prod, a gente ajusta depois com APP_ENV.
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
            props.getWhatsappLanguage()
    );
}
    // ===== InMemory stores =====
    // (precisa desses beans, a menos que você tenha @Component nas classes)

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

    // ===== Supabase (somente quando habilitado) =====
    // NÃO retorna null

    @Bean
    @ConditionalOnProperty(name = "supabase.enabled", havingValue = "true")
    public SupabaseClient supabaseClient(RestTemplate http, AppProperties props) {
        return new SupabaseClient(http, props.getSupabaseUrl(), props.getSupabaseKey(), props.getSupabaseSchema());
    }

    // ===== Store abstractions (Supabase se existir, senão InMemory) =====

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

    // ===== Services =====

    @Bean
    public ServicoService servicoService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationService verificationService,
            AppProperties props) {
        return new ServicoService(calendarClient, tokenUtil, verificationService, props);
    }

    @Bean
    public VerificationService verificationService(
            CalendarClient calendarClient,
            TokenUtil tokenUtil,
            VerificationStore verificationStore,
            WhatsAppClient whatsAppClient,
            AppProperties props) {
        return new VerificationService(calendarClient, tokenUtil, verificationStore, whatsAppClient, props);
    }

    @Bean
    public RecoveryService recoveryService(
            VerificationStore verificationStore,
            PendingStore pendingStore,
            HistoryStore historyStore,
            WhatsAppClient whatsAppClient,
            AppProperties props,
            ServicoService servicoService) {
        return new RecoveryService(verificationStore, pendingStore, historyStore, whatsAppClient, props,
                servicoService);
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
            HistoryStore historyStore) {
        return new InternalCleanupService(calendarClient, pendingStore, verificationStore, historyStore);
    }

    @Bean
    public GoogleRoutesClient googleRoutesClient(RestTemplate http, AppProperties props) {
        // só cria com key (evita NPE). Se quiser fail-fast em prod, a gente faz depois.
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