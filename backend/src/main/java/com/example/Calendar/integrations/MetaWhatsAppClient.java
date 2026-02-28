package com.example.Calendar.integrations;

import com.example.Calendar.exception.BadRequestException;
import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

public class MetaWhatsAppClient implements WhatsAppClient {

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
            throw new BadRequestException("WhatsApp não configurado (token/phoneNumberId/template)");
        }
        if (isBlank(phoneDigits) || isBlank(code)) {
            throw new BadRequestException("Telefone/código inválidos");
        }

        String url = "https://graph.facebook.com/v21.0/" + phoneNumberId + "/messages";

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("messaging_product", "whatsapp");
        payload.put("to", toE164BR(phoneDigits));
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

        ResponseEntity<String> resp = http.exchange(url, HttpMethod.POST, req, String.class);
        if (!resp.getStatusCode().is2xxSuccessful()) {
            throw new BadRequestException("Falha ao enviar WhatsApp (status=" + resp.getStatusCode().value() + ")");
        }
    }

    private static String toE164BR(String phoneDigits) {
        // telefone já vem normalizado (10-11 dígitos). Adiciona +55.
        return "55" + phoneDigits;
    }

    private static boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }
}