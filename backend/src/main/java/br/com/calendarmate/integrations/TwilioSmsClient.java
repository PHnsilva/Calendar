package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.BadRequestException;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.net.URI;

public class TwilioSmsClient implements OtpDeliveryClient {

    private final RestTemplate http;
    private final String accountSid;
    private final String authToken;
    private final String fromNumber;
    private final String frontendUrl;

    public TwilioSmsClient(
            RestTemplate http,
            String accountSid,
            String authToken,
            String fromNumber,
            String frontendUrl
    ) {
        this.http = http;
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.fromNumber = fromNumber;
        this.frontendUrl = frontendUrl;
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        if (isBlank(accountSid) || isBlank(authToken) || isBlank(fromNumber)) {
            throw new BadRequestException("SMS não configurado (Twilio accountSid/authToken/fromNumber)");
        }
        if (isBlank(phoneDigits) || isBlank(code)) {
            throw new BadRequestException("Telefone/código inválidos");
        }

        String url = "https://api.twilio.com/2010-04-01/Accounts/" + accountSid + "/Messages.json";

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("To", toE164BR(phoneDigits));
        body.add("From", fromNumber.trim());
        body.add("Body", buildMessage(code));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        headers.setBasicAuth(accountSid, authToken);

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        ResponseEntity<String> response = http.exchange(url, HttpMethod.POST, request, String.class);

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new BadRequestException("Falha ao enviar SMS (status=" + response.getStatusCode().value() + ")");
        }
    }

    @Override
    public String getChannel() {
        return "SMS";
    }

    private String buildMessage(String code) {
        StringBuilder message = new StringBuilder();
        message.append("Seu código CalendarMate é ").append(code).append(".\n");
        message.append("Cole no app para confirmar o telefone.");

        String host = extractHost(frontendUrl);
        if (!host.isBlank()) {
            message.append("\n\n@").append(host).append(" #").append(code);
        }

        return message.toString();
    }

    private static String extractHost(String rawUrl) {
        if (isBlank(rawUrl)) {
            return "";
        }
        try {
            URI uri = URI.create(rawUrl.trim());
            return uri.getHost() == null ? "" : uri.getHost().trim();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String toE164BR(String phoneDigits) {
        return "+55" + phoneDigits;
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
