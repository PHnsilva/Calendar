package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.exception.ExternalServiceException;
import br.com.calendarmate.util.PhoneNumberNormalizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

public class NotificationApiSmsClient implements OtpDeliveryClient {
    private static final Logger log = LoggerFactory.getLogger(NotificationApiSmsClient.class);
    private static final String PROVIDER_NAME = "NotificationAPI";
    private static final String SEND_PATH = "/send";
    private static final String REQUEST_METHOD = "POST";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(10);
    private static final int MAX_LOG_BODY_CHARS = 500;

    private final HttpClient httpClient;
    private final String apiKey;
    private final URI sendUri;
    private final String notificationType;
    private final MonthlySmsQuota quota;
    private final String publicDomain;

    public NotificationApiSmsClient(
            String apiKey,
            String baseUrl,
            String notificationType,
            MonthlySmsQuota quota,
            String publicDomain) {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(REQUEST_TIMEOUT)
                .build();
        this.apiKey = apiKey;
        this.sendUri = resolveSendUri(baseUrl);
        this.notificationType = notificationType;
        this.quota = quota;
        this.publicDomain = cleanDomain(publicDomain);
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        String normalizedPhone = PhoneNumberNormalizer.normalizeBrazilianMobilePhone(phoneDigits);
        if (apiKey == null || apiKey.isBlank()) {
            throw ExternalServiceException.providerConfigMissing(PROVIDER_NAME, "Provedor de verificacao SMS nao configurado.");
        }
        if (notificationType == null || notificationType.isBlank()) {
            throw ExternalServiceException.providerConfigMissing(PROVIDER_NAME, "Provedor de verificacao SMS nao configurado.");
        }
        if (code == null || code.isBlank()) {
            throw new BadRequestException("Codigo invalido");
        }

        quota.acquire();
        try {
            sendRequest(normalizedPhone, code);
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
            log.info(
                    "Verification provider call starting provider={} method={} providerHost={} providerPath={} timeoutSeconds={} phone={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    sendUri.getHost(),
                    safePath(sendUri),
                    REQUEST_TIMEOUT.toSeconds(),
                    maskPhone(toE164(phoneDigits)));

            HttpResponse<String> response = httpClient.send(
                    buildRequest(phoneDigits, code),
                    HttpResponse.BodyHandlers.ofString());

            validateResponse(response);
        } catch (HttpTimeoutException ex) {
            log.warn(
                    "Verification SMS provider timeout provider={} method={} providerHost={} providerPath={} timeoutSeconds={} phone={} exceptionClass={} exceptionMessage={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    sendUri.getHost(),
                    safePath(sendUri),
                    REQUEST_TIMEOUT.toSeconds(),
                    maskPhone(toE164(phoneDigits)),
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            throw ExternalServiceException.providerTimeout(PROVIDER_NAME, ex);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            log.warn(
                    "Verification SMS interrupted provider={} method={} providerHost={} providerPath={} phone={} exceptionClass={} exceptionMessage={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    sendUri.getHost(),
                    safePath(sendUri),
                    maskPhone(toE164(phoneDigits)),
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            throw ExternalServiceException.upstreamFailure(PROVIDER_NAME, null, ex);
        } catch (IOException ex) {
            log.warn(
                    "Verification SMS transport failure provider={} method={} providerHost={} providerPath={} phone={} exceptionClass={} exceptionMessage={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    sendUri.getHost(),
                    safePath(sendUri),
                    maskPhone(toE164(phoneDigits)),
                    ex.getClass().getSimpleName(),
                    safeExceptionMessage(ex));
            throw ExternalServiceException.upstreamFailure(PROVIDER_NAME, null, ex);
        }
    }

    private HttpRequest buildRequest(String phoneDigits, String code) {
        return HttpRequest.newBuilder()
                .uri(sendUri)
                .timeout(REQUEST_TIMEOUT)
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
            log.info(
                    "Verification SMS provider accepted request provider={} method={} providerHost={} providerPath={} status={}",
                    PROVIDER_NAME,
                    REQUEST_METHOD,
                    sendUri.getHost(),
                    safePath(sendUri),
                    response.statusCode());
            return;
        }

        log.warn(
                "Verification SMS provider rejected request provider={} method={} providerHost={} providerPath={} status={} responseBody={}",
                PROVIDER_NAME,
                REQUEST_METHOD,
                sendUri.getHost(),
                safePath(sendUri),
                response.statusCode(),
                sanitizeResponseBody(response.body()));
        throw mapProviderStatus(response.statusCode());
    }

    private ExternalServiceException mapProviderStatus(int providerStatus) {
        if (providerStatus == 401 || providerStatus == 403) {
            return ExternalServiceException.providerAuthFailed(PROVIDER_NAME, providerStatus);
        }
        if (providerStatus == 408) {
            return ExternalServiceException.providerTimeout(PROVIDER_NAME, null);
        }
        if (providerStatus >= 400 && providerStatus < 500) {
            return ExternalServiceException.providerRejectedRequest(PROVIDER_NAME, providerStatus);
        }
        return ExternalServiceException.upstreamFailure(PROVIDER_NAME, providerStatus, null);
    }

    private String message(String code) {
        return """
                Seu código CalendarMate é: %s

                @%s #%s
                """.formatted(code, publicDomain, code);
    }

    private String toE164(String phoneDigits) {
        return PhoneNumberNormalizer.toE164(phoneDigits);
    }

    private String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }

    private URI resolveSendUri(String value) {
        String url = value == null || value.isBlank() ? "https://api.pingram.io" : value.trim();
        url = url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
        URI uri = URI.create(url);
        String path = uri.getPath() == null ? "" : uri.getPath();
        if (path.equals(SEND_PATH) || path.endsWith(SEND_PATH)) {
            return uri;
        }
        return URI.create(url + SEND_PATH);
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

    private String safePath(URI uri) {
        String path = uri.getPath();
        return path == null || path.isBlank() ? "/" : path;
    }

    private String maskPhone(String phone) {
        String digits = digitsOnly(phone);
        if (digits.length() <= 4) {
            return "****";
        }
        int prefixLength = Math.min(4, digits.length() - 4);
        return "+" + digits.substring(0, prefixLength) + "*****" + digits.substring(digits.length() - 4);
    }

    private String safeExceptionMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "";
        }
        return sanitizeResponseBody(message);
    }

    private String sanitizeResponseBody(String body) {
        if (body == null || body.isBlank()) {
            return "";
        }
        String sanitized = body
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("pingram_sk_[A-Za-z0-9._~+/=-]+", "pingram_sk_[redacted]")
                .replaceAll("(?i)(\"message\"\\s*:\\s*\").*?(\")", "$1[redacted]$2")
                .replaceAll("(?i)(codigo|código)\\s+CalendarMate\\s+(e|é)\\s*:?\\s*\\d{3}", "$1 CalendarMate $2: [redacted]")
                .replaceAll("\\+?55\\d{10,11}", "+55******0000");
        return sanitized.length() > MAX_LOG_BODY_CHARS
                ? sanitized.substring(0, MAX_LOG_BODY_CHARS) + "...[truncated]"
                : sanitized;
    }
}
