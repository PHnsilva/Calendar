package br.com.calendarmate.integrations.supabase;

import br.com.calendarmate.exception.ExternalServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

public class SupabaseClient {
    private static final Logger log = LoggerFactory.getLogger(SupabaseClient.class);
    private static final String PROVIDER_NAME = "Supabase";
    private static final int MAX_LOG_BODY_CHARS = 500;

    private final RestTemplate http;
    private final String baseUrl; // ex: https://xxxx.supabase.co
    private final String apiKey; // anon/service_role JWT legacy ou sb_secret_/sb_publishable_
    private final String schema; // ex: public

    public SupabaseClient(RestTemplate http, String baseUrl, String apiKey, String schema) {
        this.http = http;
        this.baseUrl = normalizeBaseUrl(baseUrl);
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.schema = (schema == null || schema.isBlank()) ? "public" : schema.trim();
    }

    public List<Map> select(String table, Map<String, String> filters, int limit, String order) {
        return execute("select", table, () -> {
            String url = restUrl(table);

            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);
            if (filters != null) {
                for (var e : filters.entrySet()) {
                    // filtro PostgREST: col=eq.value
                    b.queryParam(e.getKey(), "eq." + e.getValue());
                }
            }
            if (limit > 0)
                b.queryParam("limit", limit);
            if (order != null && !order.isBlank())
                b.queryParam("order", order);

            HttpEntity<Void> req = new HttpEntity<>(headers(false));
            ResponseEntity<List> resp = http.exchange(b.toUriString(), HttpMethod.GET, req, List.class);

            return resp.getBody();
        });
    }

    public void insert(String table, Object jsonBody) {
        executeVoid("insert", table, () -> {
            String url = restUrl(table);

            HttpEntity<Object> req = new HttpEntity<>(jsonBody, headers(true));
            http.exchange(url, HttpMethod.POST, req, String.class);
        });
    }

    public void upsert(String table, Object jsonBody, String onConflict) {
        executeVoid("upsert", table, () -> {
            String url = restUrl(table);
            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);
            if (onConflict != null && !onConflict.isBlank()) {
                b.queryParam("on_conflict", onConflict.trim());
            }

            HttpHeaders h = headers(true);
            h.set("Prefer", "resolution=merge-duplicates,return=representation");
            HttpEntity<Object> req = new HttpEntity<>(jsonBody, h);
            http.exchange(b.toUriString(), HttpMethod.POST, req, String.class);
        });
    }

    public void delete(String table, Map<String, String> filters) {
        executeVoid("delete", table, () -> {
            String url = restUrl(table);
            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);

            if (filters != null) {
                for (var e : filters.entrySet()) {
                    b.queryParam(e.getKey(), "eq." + e.getValue());
                }
            }

            HttpEntity<Void> req = new HttpEntity<>(headers(false));
            http.exchange(b.toUriString(), HttpMethod.DELETE, req, String.class);
        });
    }

    public void update(String table, Map<String, String> filters, Object jsonBody) {
        executeVoid("update", table, () -> {
            String url = restUrl(table);
            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);

            if (filters != null) {
                for (var e : filters.entrySet()) {
                    b.queryParam(e.getKey(), "eq." + e.getValue());
                }
            }

            HttpEntity<Object> req = new HttpEntity<>(jsonBody, headers(false));
            http.exchange(b.toUriString(), HttpMethod.PATCH, req, String.class);
        });
    }

    public int deleteLt(String table, String column, long value) {
        return execute("deleteLt", table, () -> {
            String url = restUrl(table);

            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url)
                    .queryParam(column, "lt." + value);

            HttpHeaders h = headers(false);
            h.set("Prefer", "return=representation");

            HttpEntity<Void> req = new HttpEntity<>(h);
            ResponseEntity<List> resp = http.exchange(b.toUriString(), HttpMethod.DELETE, req, List.class);

            List body = resp.getBody();
            return body == null ? 0 : body.size();
        });
    }

    private HttpHeaders headers(boolean returningRepresentation) {
        validateConfig();

        HttpHeaders h = new HttpHeaders();
        h.set("apikey", apiKey);

        // Chaves antigas do Supabase sao JWTs e aceitam Authorization: Bearer.
        // As chaves novas sb_secret_/sb_publishable_ nao sao JWTs; envia-las como Bearer
        // faz o Supabase tentar validar um JWT inexistente e retornar 401/Invalid JWT.
        if (isLegacyJwtKey(apiKey)) {
            h.set("Authorization", "Bearer " + apiKey);
        }

        h.setAccept(List.of(MediaType.APPLICATION_JSON));
        h.setContentType(MediaType.APPLICATION_JSON);
        h.set("Accept-Profile", schema);
        h.set("Content-Profile", schema);
        if (returningRepresentation) {
            h.set("Prefer", "return=representation");
        }
        return h;
    }

    private void validateConfig() {
        if (baseUrl.isBlank()) {
            throw new ExternalServiceException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "SUPABASE_CONFIG_MISSING",
                    "Supabase nao configurado: SUPABASE_URL ausente.",
                    PROVIDER_NAME,
                    null,
                    null);
        }
        if (apiKey.isBlank()) {
            throw new ExternalServiceException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "SUPABASE_CONFIG_MISSING",
                    "Supabase nao configurado: SUPABASE_KEY ausente.",
                    PROVIDER_NAME,
                    null,
                    null);
        }
    }

    private <T> T execute(String operation, String table, Supplier<T> supplier) {
        try {
            validateConfig();
            log.debug(
                    "Supabase request starting operation={} table={} host={} path=/rest/v1/{} schema={} keyType={}",
                    operation,
                    table,
                    safeHost(),
                    table,
                    schema,
                    keyType(apiKey));
            return supplier.get();
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (HttpStatusCodeException ex) {
            log.warn(
                    "Supabase request failed operation={} table={} host={} status={} responseBody={}",
                    operation,
                    table,
                    safeHost(),
                    ex.getStatusCode().value(),
                    sanitizeResponseBody(ex.getResponseBodyAsString()));
            throw mapSupabaseStatus(ex);
        } catch (ResourceAccessException ex) {
            log.warn(
                    "Supabase request timeout/network failure operation={} table={} host={} exceptionClass={} exceptionMessage={}",
                    operation,
                    table,
                    safeHost(),
                    ex.getClass().getSimpleName(),
                    sanitizeResponseBody(ex.getMessage()));
            throw new ExternalServiceException(
                    HttpStatus.GATEWAY_TIMEOUT,
                    "SUPABASE_TIMEOUT",
                    "Tempo esgotado ao consultar Supabase.",
                    PROVIDER_NAME,
                    null,
                    ex);
        } catch (RestClientException ex) {
            log.warn(
                    "Supabase REST failure operation={} table={} host={} exceptionClass={} exceptionMessage={}",
                    operation,
                    table,
                    safeHost(),
                    ex.getClass().getSimpleName(),
                    sanitizeResponseBody(ex.getMessage()));
            throw new ExternalServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "SUPABASE_UNAVAILABLE",
                    "Falha ao consultar Supabase.",
                    PROVIDER_NAME,
                    null,
                    ex);
        }
    }

    private void executeVoid(String operation, String table, Runnable runnable) {
        execute(operation, table, () -> {
            runnable.run();
            return null;
        });
    }

    private ExternalServiceException mapSupabaseStatus(HttpStatusCodeException ex) {
        int status = ex.getStatusCode().value();
        if (status == 401 || status == 403) {
            return new ExternalServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "SUPABASE_AUTH_FAILED",
                    "Falha de autenticacao ao consultar Supabase.",
                    PROVIDER_NAME,
                    status,
                    ex);
        }
        if (status == 404) {
            return new ExternalServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "SUPABASE_TABLE_NOT_FOUND",
                    "Tabela Supabase nao encontrada ou inacessivel.",
                    PROVIDER_NAME,
                    status,
                    ex);
        }
        if (status >= 400 && status < 500) {
            return new ExternalServiceException(
                    HttpStatus.BAD_GATEWAY,
                    "SUPABASE_REJECTED_REQUEST",
                    "Supabase recusou a consulta.",
                    PROVIDER_NAME,
                    status,
                    ex);
        }
        return new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "SUPABASE_UNAVAILABLE",
                "Supabase indisponivel.",
                PROVIDER_NAME,
                status,
                ex);
    }

    private String restUrl(String table) {
        return baseUrl + "/rest/v1/" + table;
    }

    private String safeHost() {
        try {
            URI uri = URI.create(baseUrl);
            return uri.getHost() == null ? "unknown-host" : uri.getHost();
        } catch (Exception ex) {
            return "invalid-url";
        }
    }

    private static boolean isLegacyJwtKey(String key) {
        return key != null && key.trim().startsWith("eyJ");
    }

    private static String keyType(String key) {
        if (key == null || key.isBlank()) {
            return "missing";
        }
        String trimmed = key.trim();
        if (trimmed.startsWith("sb_secret_")) {
            return "sb_secret";
        }
        if (trimmed.startsWith("sb_publishable_")) {
            return "sb_publishable";
        }
        if (isLegacyJwtKey(trimmed)) {
            return "legacy_jwt";
        }
        return "unknown";
    }

    private static String normalizeBaseUrl(String s) {
        if (s == null) {
            return "";
        }
        String x = s.trim();
        while (x.endsWith("/")) {
            x = x.substring(0, x.length() - 1);
        }
        if (x.endsWith("/rest/v1")) {
            x = x.substring(0, x.length() - "/rest/v1".length());
        }
        while (x.endsWith("/")) {
            x = x.substring(0, x.length() - 1);
        }
        return x;
    }

    private String sanitizeResponseBody(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String sanitized = body
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("(?i)(apikey|api_key|token|authorization)=([^&\\s]+)", "$1=[redacted]")
                .replaceAll("(?i)(apikey|authorization):\\s*\\[[^\\]]+]", "$1: [redacted]")
                .replaceAll("sb_(secret|publishable)_[A-Za-z0-9._~+/=-]+", "sb_$1_[redacted]")
                .replaceAll("eyJ[A-Za-z0-9._~+/=-]+", "eyJ[redacted]")
                .replaceAll("\\+?55\\d{10,11}", "+55*****0000");
        return sanitized.length() > MAX_LOG_BODY_CHARS
                ? sanitized.substring(0, MAX_LOG_BODY_CHARS) + "...[truncated]"
                : sanitized;
    }
}
