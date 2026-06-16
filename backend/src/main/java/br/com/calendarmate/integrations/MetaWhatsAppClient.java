package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

import java.net.SocketTimeoutException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MetaWhatsAppClient implements WhatsAppClient {
    private static final Logger log = LoggerFactory.getLogger(MetaWhatsAppClient.class);
    private static final String PROVIDER_NAME = "MetaWhatsApp";
    private static final String GRAPH_HOST = "graph.facebook.com";
    private static final String REQUEST_METHOD = "POST";
    private static final String REQUEST_TIMEOUT_CONFIG = "RestTemplate default";
    private static final int MAX_LOG_BODY_CHARS = 500;

    private final RestTemplate http;
    private final String token;
    private final String phoneNumberId;
    private final String templateName;
    private final String languageCode;

    public MetaWhatsAppClient(
            RestTemplate http,
            String token,
            String phoneNumberId,
            String templateName,
            String languageCode
    ) {
        this.http = http;
        this.token = token;
        this.phoneNumberId = phoneNumberId;
        this.templateName = templateName;
        this.languageCode = (languageCode == null || languageCode.isBlank()) ? "pt_BR" : languageCode.trim();
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        if (isBlank(token) || isBlank(phoneNumberId) || isBlank(templateName)) {
            throw ExternalServiceException.providerConfigMissing(PROVIDER_NAME, "Provedor de verificacao WhatsApp nao configurado.");
        }
        if (isBlank(code)) {
            throw new BadRequestException("Codigo invalido");
        }

        String normalizedPhone = PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phoneDigits);
        String providerPhone = toMetaPhone(normalizedPhone);
        String path = "/v21.0/" + phoneNumberId + "/messages";
        String url = "https://" + GRAPH_HOST + path;

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", providerPhone);
        payload.put("type", "template");

        Map<String, Object> template = new LinkedHashMap<>();
        template.put("name", templateName);
        template.put("language", Map.of("code", languageCode));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "body");
        body.put("parameters", List.of(
                Map.of("type", "text", "text", code)
        ));

        template.put("components", List.of(body));
        payload.put("template", template);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);

        HttpEntity<Map<String, Object>> req = new HttpEntity<>(payload, headers);

        try {
            log.info(
                    "Verification provider call starting provider={} method={} providerHost={} providerPath={} timeoutConfig={} phone={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    GRAPH_HOST,
                    path,
                    REQUEST_TIMEOUT_CONFIG,
                    maskPhone(providerPhone));
            ResponseEntity<String> resp = http.exchange(url, HttpMethod.POST, req, String.class);
            log.info(
                    "Verification WhatsApp provider accepted request provider={} method={} providerHost={} providerPath={} status={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    GRAPH_HOST,
                    path,
                    resp.getStatusCode().value());
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Verification WhatsApp provider rejected request provider={} method={} providerHost={} providerPath={} status={} responseBody={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    GRAPH_HOST,
                    path,
                    ex.getRawStatusCode(),
                    sanitizeResponseBody(ex.getResponseBodyAsString()));
            throw mapProviderStatus(ex.getRawStatusCode(), ex);
        } catch (RestClientException ex) {
            log.warn(
                    "Verification WhatsApp transport failure provider={} method={} providerHost={} providerPath={} phone={} exceptionClass={} exceptionMessage={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    GRAPH_HOST,
                    path,
                    maskPhone(providerPhone),
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            if (hasCause(ex, SocketTimeoutException.class)) {
                throw ExternalServiceException.providerTimeout(PROVIDER_NAME, ex);
            }
            throw ExternalServiceException.upstreamFailure(PROVIDER_NAME, null, ex);
        }
    }

    private static ExternalServiceException mapProviderStatus(int providerStatus, Throwable cause) {
        if (providerStatus == 401 || providerStatus == 403) {
            return ExternalServiceException.providerAuthFailed(PROVIDER_NAME, providerStatus);
        }
        if (providerStatus == 408) {
            return ExternalServiceException.providerTimeout(PROVIDER_NAME, cause);
        }
        if (providerStatus >= 400 && providerStatus < 500) {
            return ExternalServiceException.providerRejectedRequest(PROVIDER_NAME, providerStatus);
        }
        return ExternalServiceException.upstreamFailure(PROVIDER_NAME, providerStatus, cause);
    }

    private static String toMetaPhone(String phoneDigits) {
        // Meta WhatsApp expects international digits without formatting or plus sign.
        return "55" + phoneDigits;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private static String maskPhone(String phone) {
        String digits = phone == null ? "" : phone.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
    }

    private static String sanitizeResponseBody(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String sanitized = body
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("EA[A-Za-z0-9._~+/=-]{20,}", "EA[redacted]")
                .replaceAll("(?i)(\"text\"\\s*:\\s*\").*?(\")", "$1[redacted]$2")
                .replaceAll("\\+?55\\d{10,11}", "55******0000");
        return sanitized.length() > MAX_LOG_BODY_CHARS
                ? sanitized.substring(0, MAX_LOG_BODY_CHARS) + "...[truncated]"
                : sanitized;
    }

    private static String safeExceptionMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "";
        }
        return sanitizeResponseBody(message);
    }

    private static boolean hasCause(Throwable ex, Class<? extends Throwable> causeType) {
        Throwable current = ex;
        while (current != null) {
            if (causeType.isInstance(current)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }
}
