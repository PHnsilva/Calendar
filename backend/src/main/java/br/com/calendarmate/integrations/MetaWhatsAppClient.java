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

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MetaWhatsAppClient implements WhatsAppClient {
    private static final Logger log = LoggerFactory.getLogger(MetaWhatsAppClient.class);
    private static final String GRAPH_HOST = "graph.facebook.com";
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
            throw new BadRequestException("WhatsApp nao configurado (token/phoneNumberId/template)");
        }
        if (isBlank(code)) {
            throw new BadRequestException("Codigo invalido");
        }

        String normalizedPhone = PhoneNumberNormalizer.normalizeBrazilianPhone(phoneDigits);
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
                    "Sending verification WhatsApp providerHost={} providerPath={} phone={}",
                    GRAPH_HOST,
                    path,
                    maskPhone(providerPhone));
            ResponseEntity<String> resp = http.exchange(url, HttpMethod.POST, req, String.class);
            log.info(
                    "Verification WhatsApp provider accepted request providerHost={} providerPath={} status={}",
                    GRAPH_HOST,
                    path,
                    resp.getStatusCode().value());
        } catch (RestClientResponseException ex) {
            log.warn(
                    "Verification WhatsApp provider rejected request providerHost={} providerPath={} status={} responseBody={}",
                    GRAPH_HOST,
                    path,
                    ex.getRawStatusCode(),
                    sanitizeResponseBody(ex.getResponseBodyAsString()));
            throw new ExternalServiceException("Falha de comunicacao com servico externo.", ex);
        } catch (RestClientException ex) {
            log.warn(
                    "Verification WhatsApp transport failure providerHost={} providerPath={} phone={} error={}",
                    GRAPH_HOST,
                    path,
                    maskPhone(providerPhone),
                    ex.toString());
            throw new ExternalServiceException("Falha de comunicacao com servico externo.", ex);
        }
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
        return digits.substring(0, Math.min(2, digits.length())) + "******" + digits.substring(digits.length() - 4);
    }

    private static String sanitizeResponseBody(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String sanitized = body
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("EA[A-Za-z0-9._~+/=-]{20,}", "EA[redacted]")
                .replaceAll("\\+?55\\d{10,11}", "55******0000");
        return sanitized.length() > MAX_LOG_BODY_CHARS
                ? sanitized.substring(0, MAX_LOG_BODY_CHARS) + "...[truncated]"
                : sanitized;
    }
}
