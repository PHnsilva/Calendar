package br.com.calendarmate.integrations;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

public class NotificationApiSmsClient implements OtpDeliveryClient {

    private final HttpClient httpClient;
    private final String apiKey;
    private final String baseUrl;
    private final String notificationType;
    private final MonthlySmsQuota quota;
    private final String publicDomain;

    public NotificationApiSmsClient(
            String apiKey,
            String baseUrl,
            String notificationType,
            MonthlySmsQuota quota,
            String publicDomain) {
        this.httpClient = HttpClient.newHttpClient();
        this.apiKey = apiKey;
        this.baseUrl = normalizeBaseUrl(baseUrl);
        this.notificationType = notificationType;
        this.quota = quota;
        this.publicDomain = cleanDomain(publicDomain);
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        quota.acquire();
        try {
            sendRequest(phoneDigits, code);
        } catch (RuntimeException ex) {
            quota.rollback();
            throw ex;
        }
    }

    @Override
    public String getChannel() {
        return "SMS";
    }

    private void sendRequest(String phoneDigits, String code) {
        try {
            HttpResponse<String> response = httpClient.send(
                    buildRequest(phoneDigits, code),
                    HttpResponse.BodyHandlers.ofString());

            validateResponse(response);
        } catch (IOException | InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Falha ao enviar SMS via NotificationAPI.", ex);
        }
    }

    private HttpRequest buildRequest(String phoneDigits, String code) {
        return HttpRequest.newBuilder()
                .uri(URI.create(baseUrl + "/send"))
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(payload(phoneDigits, code), StandardCharsets.UTF_8))
                .build();
    }

    private String payload(String phoneDigits, String code) {
        return """
                {
                  "type": "%s",
                  "to": {
                    "number": "%s"
                  },
                  "sms": {
                    "message": "%s"
                  }
                }
                """.formatted(
                escape(notificationType),
                escape(toE164(phoneDigits)),
                escape(message(code)));
    }

    private void validateResponse(HttpResponse<String> response) {
        if (response.statusCode() >= 200 && response.statusCode() < 300) {
            return;
        }

        throw new IllegalStateException(
                "NotificationAPI recusou o SMS. Status: "
                        + response.statusCode()
                        + ". Body: "
                        + response.body());
    }

    private String message(String code) {
        return """
                Seu código CalendarMate é: %s

                @%s #%s
                """.formatted(code, publicDomain, code);
    }

    private String toE164(String phoneDigits) {
        if (phoneDigits != null && phoneDigits.trim().startsWith("+")) {
            return phoneDigits.trim();
        }

        String digits = digitsOnly(phoneDigits);
        return digits.startsWith("55") ? "+" + digits : "+55" + digits;
    }

    private String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }

    private String normalizeBaseUrl(String value) {
        String url = value == null || value.isBlank() ? "https://api.pingram.io" : value.trim();
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }

    private String cleanDomain(String value) {
        String domain = value == null || value.isBlank() ? "calendar-mate.vercel.app" : value.trim();
        domain = domain.replaceFirst("^https?://", "");
        return domain.endsWith("/") ? domain.substring(0, domain.length() - 1) : domain;
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\r", "\\r")
                .replace("\n", "\\n");
    }
}