package br.com.calendarmate.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.client.RestClientException;

import java.io.IOException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ResponseEntity<ApiError> build(HttpStatus status, String code, String msg, HttpServletRequest req) {
        return build(status, code, msg, req, null, null);
    }

    private ResponseEntity<ApiError> build(HttpStatus status, String code, String msg, HttpServletRequest req, String field, Object details) {
        return ResponseEntity
                .status(status)
                .body(new ApiError(status.value(), code, msg, req.getRequestURI(), field, details));
    }

    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> missingParam(
            org.springframework.web.bind.MissingServletRequestParameterException ex,
            jakarta.servlet.http.HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_PARAM",
                ex.getParameterName() + " é obrigatório", req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> illegalArg(IllegalArgumentException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), req);
    }


    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiError> forbidden(ForbiddenException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), req);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> notFound(NotFoundException ex, HttpServletRequest req) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), req);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> conflict(ConflictException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), req);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> badRequest(BadRequestException ex, HttpServletRequest req) {
        if (ex instanceof DetailedBadRequestException detailed) {
            return build(HttpStatus.BAD_REQUEST, detailed.getCode(), detailed.getMessage(), req, detailed.getField(), detailed.getDetails());
        }
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), req);
    }

    @ExceptionHandler(InvalidPhoneException.class)
    public ResponseEntity<ApiError> invalidPhone(InvalidPhoneException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_PHONE", ex.getMessage(), req);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> constraint(ConstraintViolationException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Dados invalidos.", req);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        // ex: date=abc
        String name = ex.getName();
        if ("date".equals(name)) {
            return build(HttpStatus.BAD_REQUEST, "INVALID_PARAM", "date deve estar no formato yyyy-MM-dd", req);
        }
        return build(HttpStatus.BAD_REQUEST, "INVALID_PARAM", "Parâmetro inválido: " + name, req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_JSON", "JSON inválido ou mal formatado.", req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        boolean phoneError = ex.getBindingResult().getFieldErrors().stream()
                .anyMatch(err -> "phone".equals(err.getField()));
        if (phoneError) {
            return build(HttpStatus.BAD_REQUEST, "INVALID_PHONE", "Telefone invalido", req);
        }
        String first = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .orElse("Dados inválidos.");
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", first, req);
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<ApiError> io(IOException ex, HttpServletRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_IO", "Erro de comunicação com Google Calendar.", req);
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ApiError> external(ExternalServiceException ex, HttpServletRequest req) {
        log.warn(
                "External verification provider failure at {} code={} provider={} providerStatus={} message={}",
                req.getRequestURI(),
                ex.getErrorCode(),
                ex.getProviderName() == null ? "unknown" : ex.getProviderName(),
                ex.getProviderStatus() == null ? "n/a" : ex.getProviderStatus(),
                ex.getMessage());
        return build(ex.getStatus(), ex.getErrorCode(), ex.getMessage(), req);
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ApiError> restClient(RestClientException ex, HttpServletRequest req) {
        log.warn(
                "Upstream REST failure at {} exceptionClass={} exceptionMessage={}",
                req.getRequestURI(),
                ex.getClass().getSimpleName(),
                safeExceptionMessage(ex));
        if (req.getRequestURI() != null && req.getRequestURI().startsWith("/api/admin/auth")) {
            return build(HttpStatus.BAD_GATEWAY, "AUTH_DEPENDENCY_UNAVAILABLE", "Falha ao consultar dependencia de autenticacao.", req);
        }
        return build(HttpStatus.BAD_GATEWAY, "UPSTREAM_ERROR", "Falha de comunicacao com servico externo.", req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> generic(Exception ex, HttpServletRequest req) {
        log.error("Unexpected error at {}", req.getRequestURI(), ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Erro inesperado.", req);
    }

    private String safeExceptionMessage(Exception ex) {
        String message = ex.getMessage();
        if (message == null || message.isBlank()) {
            return "";
        }
        return message
                .replaceAll("(?i)bearer\\s+[A-Za-z0-9._~+/=-]+", "Bearer [redacted]")
                .replaceAll("(?i)(apikey|api_key|token|authorization)=([^&\\s]+)", "$1=[redacted]")
                .replaceAll("(?i)(apikey|authorization):\\s*\\[[^\\]]+]", "$1: [redacted]")
                .replaceAll("(?i)(phone_digits=eq\\.)\\+?55\\d{10,11}", "$1+55*****0000")
                .replaceAll("\\+?55\\d{10,11}", "+55*****0000");
    }
}
