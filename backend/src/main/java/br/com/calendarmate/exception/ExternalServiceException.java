package br.com.calendarmate.exception;

import org.springframework.http.HttpStatus;

public class ExternalServiceException extends RuntimeException {
    private final HttpStatus status;
    private final String errorCode;
    private final String providerName;
    private final Integer providerStatus;

    public ExternalServiceException(String msg) {
        this(HttpStatus.BAD_GATEWAY, "PROVIDER_UNAVAILABLE", msg, null, null, null);
    }

    public ExternalServiceException(String msg, Throwable cause) {
        this(HttpStatus.BAD_GATEWAY, "PROVIDER_UNAVAILABLE", msg, null, null, cause);
    }

    public ExternalServiceException(
            HttpStatus status,
            String errorCode,
            String msg,
            String providerName,
            Integer providerStatus,
            Throwable cause) {
        super(msg, cause);
        this.status = status;
        this.errorCode = errorCode;
        this.providerName = providerName;
        this.providerStatus = providerStatus;
    }

    public static ExternalServiceException providerConfigMissing(String providerName, String msg) {
        return new ExternalServiceException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "PROVIDER_CONFIG_MISSING",
                msg,
                providerName,
                null,
                null);
    }

    public static ExternalServiceException providerAuthFailed(String providerName, int providerStatus) {
        return new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "PROVIDER_AUTH_FAILED",
                "Falha de autenticacao no provedor de verificacao.",
                providerName,
                providerStatus,
                null);
    }

    public static ExternalServiceException providerRejectedRequest(String providerName, int providerStatus) {
        return new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "PROVIDER_REJECTED_REQUEST",
                "Provedor recusou a solicitacao de verificacao.",
                providerName,
                providerStatus,
                null);
    }

    public static ExternalServiceException providerTimeout(String providerName, Throwable cause) {
        return new ExternalServiceException(
                HttpStatus.GATEWAY_TIMEOUT,
                "PROVIDER_TIMEOUT",
                "Tempo esgotado ao comunicar com provedor de verificacao.",
                providerName,
                null,
                cause);
    }

    public static ExternalServiceException upstreamFailure(String providerName, Integer providerStatus, Throwable cause) {
        return new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "PROVIDER_UNAVAILABLE",
                "Provedor de verificacao indisponivel.",
                providerName,
                providerStatus,
                cause);
    }

    public static ExternalServiceException authDependencyUnavailable(String dependencyName, Throwable cause) {
        return new ExternalServiceException(
                HttpStatus.BAD_GATEWAY,
                "AUTH_DEPENDENCY_UNAVAILABLE",
                "Falha ao consultar dependencia de autenticacao.",
                dependencyName,
                null,
                cause);
    }

    public HttpStatus getStatus() {
        return status;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public String getProviderName() {
        return providerName;
    }

    public Integer getProviderStatus() {
        return providerStatus;
    }
}
