package br.com.calendarmate.exception;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.text.Normalizer;
import java.util.Locale;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private static final String MSG_GENERIC_RETRY = "Algo deu errado ao concluir a ação. Tente novamente.";
    private static final String MSG_DEPENDENCY_RETRY = "Não foi possível concluir agora. Tente novamente em alguns instantes.";
    private static final String MSG_AUTH_DEPENDENCY_RETRY = "Não foi possível validar sua sessão agora. Tente novamente em instantes.";
    private static final String MSG_NETWORK_RETRY = "Verifique sua conexão e tente novamente.";
    private static final String MSG_PERMISSION = "Você não tem permissão para realizar essa ação.";
    private static final String MSG_SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";
    private static final String MSG_INVALID_ACCESS_LINK = "Não foi possível validar seu acesso. Abra o link novamente para continuar.";
    private static final String MSG_BOOKING_SLOT_UNAVAILABLE = "Esse horário acabou de ficar indisponível. Escolha outro horário.";
    private static final String MSG_VERIFICATION_SEND_FAILED = "Não conseguimos enviar o código agora. Confira o número e tente novamente.";
    private static final String MSG_INVALID_CODE = "Código inválido ou expirado. Confira os dígitos e tente novamente.";
    private static final String MSG_VALIDATION = "Revise os dados informados e tente novamente.";

    private record ErrorDescriptor(
            HttpStatus status,
            String code,
            String message,
            boolean retryable,
            String field,
            Object details
    ) {}

    private ResponseEntity<ApiError> build(ErrorDescriptor descriptor, HttpServletRequest req) {
        return ResponseEntity
                .status(descriptor.status())
                .body(new ApiError(
                        descriptor.status().value(),
                        descriptor.code(),
                        descriptor.message(),
                        req.getRequestURI(),
                        descriptor.retryable(),
                        descriptor.field(),
                        descriptor.details()));
    }

    private ErrorDescriptor descriptor(HttpStatus status, String code, String message, boolean retryable) {
        return new ErrorDescriptor(status, code, message, retryable, null, null);
    }

    private ErrorDescriptor descriptor(HttpStatus status, String code, String message, boolean retryable, String field, Object details) {
        return new ErrorDescriptor(status, code, message, retryable, field, details);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiError> missingParam(MissingServletRequestParameterException ex, HttpServletRequest req) {
        return build(descriptor(
                HttpStatus.BAD_REQUEST,
                "VALIDATION_ERROR",
                "Preencha " + fieldLabel(ex.getParameterName()) + " e tente novamente.",
                false,
                ex.getParameterName(),
                null), req);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> illegalArg(IllegalArgumentException ex, HttpServletRequest req) {
        log.warn("Bad request at {} exceptionClass={} exceptionMessage={}", req.getRequestURI(), ex.getClass().getSimpleName(), safeExceptionMessage(ex));
        return build(descriptor(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", MSG_VALIDATION, false), req);
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiError> forbidden(ForbiddenException ex, HttpServletRequest req) {
        log.warn("Forbidden request at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(mapForbidden(ex, req), req);
    }

    @ExceptionHandler(ReservedAdminPhoneException.class)
    public ResponseEntity<ApiError> reservedAdminPhone(ReservedAdminPhoneException ex, HttpServletRequest req) {
        log.warn("Reserved phone rejected at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(descriptor(
                HttpStatus.FORBIDDEN,
                "RESERVED_ACCESS",
                "Esse número usa uma área de acesso diferente. Entre pela área correta para continuar.",
                false), req);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiError> notFound(NotFoundException ex, HttpServletRequest req) {
        return build(mapNotFound(ex), req);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiError> conflict(ConflictException ex, HttpServletRequest req) {
        return build(mapConflict(ex), req);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiError> badRequest(BadRequestException ex, HttpServletRequest req) {
        if (ex instanceof DetailedBadRequestException detailed) {
            logDetailedBadRequest(detailed, req);
            return build(mapDetailedBadRequest(detailed), req);
        }
        log.warn("Bad request at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(mapBadRequest(ex, req), req);
    }

    @ExceptionHandler(InvalidPhoneException.class)
    public ResponseEntity<ApiError> invalidPhone(InvalidPhoneException ex, HttpServletRequest req) {
        return build(descriptor(
                HttpStatus.BAD_REQUEST,
                "INVALID_PHONE",
                "Informe um celular válido com DDD.",
                false,
                "phone",
                null), req);
    }

    @ExceptionHandler(NotMobilePhoneException.class)
    public ResponseEntity<ApiError> notMobilePhone(NotMobilePhoneException ex, HttpServletRequest req) {
        return build(descriptor(
                HttpStatus.BAD_REQUEST,
                "INVALID_PHONE",
                "Informe um celular brasileiro com DDD e 9 dígitos.",
                false,
                "phone",
                null), req);
    }

    @ExceptionHandler(SmsQuotaExceededException.class)
    public ResponseEntity<ApiError> smsQuotaExceeded(SmsQuotaExceededException ex, HttpServletRequest req) {
        log.warn("SMS quota exceeded at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(descriptor(
                HttpStatus.TOO_MANY_REQUESTS,
                "VERIFICATION_DELIVERY_LIMIT",
                "Não conseguimos enviar o código agora. Tente novamente mais tarde.",
                true), req);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> constraint(ConstraintViolationException ex, HttpServletRequest req) {
        log.warn("Validation failure at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(descriptor(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", MSG_VALIDATION, false), req);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> typeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        String field = ex.getName();
        String message = "date".equals(field)
                ? "Informe a data no formato correto."
                : "Revise " + fieldLabel(field) + " e tente novamente.";
        return build(descriptor(HttpStatus.BAD_REQUEST, "INVALID_PARAM", message, false, field, null), req);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> unreadable(HttpMessageNotReadableException ex, HttpServletRequest req) {
        log.warn("Unreadable request body at {} exceptionMessage={}", req.getRequestURI(), safeExceptionMessage(ex));
        return build(descriptor(HttpStatus.BAD_REQUEST, "INVALID_REQUEST_BODY", "Revise os dados enviados e tente novamente.", false), req);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> validation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        var firstError = ex.getBindingResult().getFieldErrors().stream().findFirst();
        if (firstError.isEmpty()) {
            return build(descriptor(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", MSG_VALIDATION, false), req);
        }

        String field = firstError.get().getField();
        String message = validationMessageForField(field, firstError.get().getDefaultMessage());
        String code = "phone".equals(field) || "clientPhone".equals(field) ? "INVALID_PHONE" : "VALIDATION_ERROR";
        return build(descriptor(HttpStatus.BAD_REQUEST, code, message, false, field, null), req);
    }

    @ExceptionHandler(IOException.class)
    public ResponseEntity<ApiError> io(IOException ex, HttpServletRequest req) {
        log.warn("Calendar communication failure at {} exceptionClass={} exceptionMessage={}", req.getRequestURI(), ex.getClass().getSimpleName(), safeExceptionMessage(ex));
        String fallbackCode = hasCause(ex, SocketTimeoutException.class) ? "DEPENDENCY_TIMEOUT" : "CALENDAR_UNAVAILABLE";
        return build(mapDependencyByPath(req.getRequestURI(), fallbackCode, true), req);
    }

    @ExceptionHandler(ExternalServiceException.class)
    public ResponseEntity<ApiError> external(ExternalServiceException ex, HttpServletRequest req) {
        log.warn(
                "Dependency failure at {} code={} dependency={} dependencyStatus={} message={}",
                req.getRequestURI(),
                ex.getErrorCode(),
                ex.getProviderName() == null ? "unknown" : ex.getProviderName(),
                ex.getProviderStatus() == null ? "n/a" : ex.getProviderStatus(),
                safeExceptionMessage(ex));
        return build(mapExternal(ex, req), req);
    }

    @ExceptionHandler(RestClientException.class)
    public ResponseEntity<ApiError> restClient(RestClientException ex, HttpServletRequest req) {
        log.warn(
                "Dependency REST failure at {} exceptionClass={} exceptionMessage={}",
                req.getRequestURI(),
                ex.getClass().getSimpleName(),
                safeExceptionMessage(ex));
        return build(mapDependencyByPath(req.getRequestURI(), "DEPENDENCY_UNAVAILABLE", true), req);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> generic(Exception ex, HttpServletRequest req) {
        log.error("Unexpected error at {}", req.getRequestURI(), ex);
        return build(descriptor(HttpStatus.INTERNAL_SERVER_ERROR, "UNEXPECTED_ERROR", MSG_GENERIC_RETRY, true), req);
    }

    private ErrorDescriptor mapForbidden(ForbiddenException ex, HttpServletRequest req) {
        String path = req.getRequestURI();
        String message = normalize(ex.getMessage());

        if (isAdminPath(path) && message.contains("senha administrativa invalida")) {
            return descriptor(HttpStatus.FORBIDDEN, "INVALID_ADMIN_PASSWORD", "Senha incorreta. Confira e tente novamente.", false, "password", null);
        }
        if (isAdminPath(path) && message.contains("telefone administrativo")) {
            return descriptor(HttpStatus.FORBIDDEN, "ADMIN_ACCESS_NOT_ALLOWED", "Esse número não tem acesso liberado.", false, "phone", null);
        }
        if (message.contains("sessao") || isAdminPath(path) && (message.contains("administrativa ausente") || message.contains("expirada"))) {
            return descriptor(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", MSG_SESSION_EXPIRED, false);
        }
        if (message.contains("token")) {
            return descriptor(HttpStatus.FORBIDDEN, "ACCESS_LINK_INVALID", MSG_INVALID_ACCESS_LINK, false);
        }
        if (message.contains("rotas desabilitadas")) {
            return descriptor(HttpStatus.FORBIDDEN, "FEATURE_UNAVAILABLE", "Esta função não está disponível agora.", false);
        }
        return descriptor(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", MSG_PERMISSION, false);
    }

    private ErrorDescriptor mapNotFound(NotFoundException ex) {
        String message = normalize(ex.getMessage());
        if (message.contains("agendamento")) {
            return descriptor(
                    HttpStatus.NOT_FOUND,
                    "BOOKING_NOT_FOUND",
                    "Não encontramos esse agendamento. Confira se ele ainda está disponível.",
                    false);
        }
        return descriptor(HttpStatus.NOT_FOUND, "NOT_FOUND", "Não encontramos o registro solicitado.", false);
    }

    private ErrorDescriptor mapConflict(ConflictException ex) {
        String message = normalize(ex.getMessage());
        if (message.contains("horario")) {
            return descriptor(HttpStatus.CONFLICT, "BOOKING_SLOT_UNAVAILABLE", MSG_BOOKING_SLOT_UNAVAILABLE, false);
        }
        if (message.contains("conflitant")) {
            return descriptor(
                    HttpStatus.CONFLICT,
                    "AVAILABILITY_BLOCK_CONFLICT",
                    "Existem agendamentos nesse período. Revise a prévia antes de bloquear.",
                    false);
        }
        return descriptor(HttpStatus.CONFLICT, "CONFLICT", "Não foi possível concluir porque os dados mudaram. Atualize e tente novamente.", false);
    }

    private ErrorDescriptor mapDetailedBadRequest(DetailedBadRequestException ex) {
        String code = safeCode(ex.getCode(), "VALIDATION_ERROR");
        String normalizedCode = normalize(code);
        if (normalizedCode.contains("autocomplete_unavailable")) {
            return descriptor(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "ADDRESS_LOOKUP_UNAVAILABLE",
                    "Não foi possível buscar endereços agora. Digite o endereço manualmente ou tente novamente em instantes.",
                    true,
                    ex.getField(),
                    null);
        }

        String message = safeCustomerMessage(ex.getMessage(), MSG_VALIDATION);
        return descriptor(
                HttpStatus.BAD_REQUEST,
                code,
                message,
                false,
                ex.getField(),
                safeDetails(ex.getDetails()));
    }

    private ErrorDescriptor mapBadRequest(BadRequestException ex, HttpServletRequest req) {
        String message = ex.getMessage();
        String normalized = normalize(message);

        if (normalized.contains("horario indisponivel")) {
            return descriptor(HttpStatus.CONFLICT, "BOOKING_SLOT_UNAVAILABLE", MSG_BOOKING_SLOT_UNAVAILABLE, false);
        }
        if (normalized.contains("horario invalido") || normalized.contains("minutos invalidos") || normalized.contains("time e obrigatorio")) {
            return descriptor(HttpStatus.BAD_REQUEST, "BOOKING_INVALID_TIME", "Escolha um horário válido para continuar.", false, "time", null);
        }
        if (normalized.contains("codigo expir") || normalized.contains("codigo inval") || normalized.contains("verificationid")) {
            return descriptor(HttpStatus.BAD_REQUEST, "VERIFICATION_CODE_INVALID", MSG_INVALID_CODE, false, "code", null);
        }
        if (normalized.contains("aguarde") && normalized.contains("reenviar")) {
            return descriptor(HttpStatus.TOO_MANY_REQUESTS, "VERIFICATION_RESEND_WAIT", "Aguarde alguns instantes antes de reenviar o código.", true);
        }
        if (normalized.contains("cep deve")) {
            return descriptor(HttpStatus.BAD_REQUEST, "INVALID_CEP", "Informe um CEP com 8 números.", false, "clientCep", null);
        }
        if (normalized.contains("cep nao encontrado")) {
            return descriptor(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND", "Não encontramos esse CEP. Revise o número e tente novamente.", false, "clientCep", null);
        }
        if (normalized.contains("data invalida") || normalized.contains("date e obrigatorio") || normalized.contains("24 horas")) {
            return descriptor(HttpStatus.BAD_REQUEST, "BOOKING_INVALID_DATE", safeCustomerMessage(message, "Escolha uma data válida para continuar."), false, "date", null);
        }
        if (normalized.contains("atendimento nao disponivel") || normalized.contains("cidade")) {
            return descriptor(HttpStatus.BAD_REQUEST, "CITY_NOT_SUPPORTED", "Ainda não atendemos essa cidade. Escolha uma das cidades disponíveis.", false, "clientCity", null);
        }
        if (normalized.contains("observacao")) {
            return descriptor(HttpStatus.BAD_REQUEST, "INVALID_SERVICE_NOTES", safeCustomerMessage(message, "Explique o serviço com pelo menos 10 caracteres."), false, "serviceNotes", null);
        }
        if (normalized.contains("agendamento ja esta no historico")) {
            return descriptor(HttpStatus.BAD_REQUEST, "BOOKING_ALREADY_COMPLETED", "Esse agendamento já foi concluído.", false);
        }
        if (normalized.contains("agendamento nao encontrado")) {
            return descriptor(HttpStatus.NOT_FOUND, "BOOKING_NOT_FOUND", "Não encontramos esse agendamento. Confira se ele ainda está disponível.", false);
        }
        if (containsTechnicalDependencyTerm(normalized)) {
            return mapDependencyByPath(req.getRequestURI(), "DEPENDENCY_UNAVAILABLE", true);
        }

        return descriptor(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", safeCustomerMessage(message, MSG_VALIDATION), false);
    }

    private ErrorDescriptor mapExternal(ExternalServiceException ex, HttpServletRequest req) {
        String errorCode = normalize(ex.getErrorCode());
        String path = req.getRequestURI();

        if (errorCode.contains("auth_dependency")) {
            return descriptor(HttpStatus.SERVICE_UNAVAILABLE, "AUTH_DEPENDENCY_UNAVAILABLE", MSG_AUTH_DEPENDENCY_RETRY, true);
        }
        if (errorCode.contains("timeout")) {
            return descriptor(HttpStatus.GATEWAY_TIMEOUT, dependencyCodeByPath(path, "DEPENDENCY_TIMEOUT"), messageByPath(path), true);
        }
        if (errorCode.startsWith("supabase") || errorCode.contains("dependency")) {
            return mapDependencyByPath(path, "DEPENDENCY_UNAVAILABLE", true);
        }
        if (isVerificationPath(path) || errorCode.contains("provider")) {
            return descriptor(HttpStatus.BAD_GATEWAY, "VERIFICATION_DELIVERY_FAILED", MSG_VERIFICATION_SEND_FAILED, true);
        }

        return mapDependencyByPath(path, "DEPENDENCY_UNAVAILABLE", true);
    }

    private ErrorDescriptor mapDependencyByPath(String path, String fallbackCode, boolean retryable) {
        String code = dependencyCodeByPath(path, fallbackCode);
        return descriptor(statusForDependency(code), code, messageByPath(path), retryable);
    }

    private HttpStatus statusForDependency(String code) {
        return "DEPENDENCY_TIMEOUT".equals(code) ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.SERVICE_UNAVAILABLE;
    }

    private String dependencyCodeByPath(String path, String fallbackCode) {
        if ("DEPENDENCY_TIMEOUT".equals(fallbackCode)) return fallbackCode;
        String normalizedPath = path == null ? "" : path.toLowerCase(Locale.ROOT);
        if (normalizedPath.contains("/rotas")) return "ROUTE_UNAVAILABLE";
        if (normalizedPath.contains("/enderecos") || normalizedPath.contains("/cep")) return "ADDRESS_LOOKUP_UNAVAILABLE";
        if (normalizedPath.contains("/finance")) return "FINANCE_UNAVAILABLE";
        if (normalizedPath.contains("/verification") || normalizedPath.contains("/recovery") || normalizedPath.contains("/admin/auth")) return "DEPENDENCY_UNAVAILABLE";
        if (normalizedPath.contains("/servicos") || normalizedPath.contains("/availability")) return "CALENDAR_UNAVAILABLE";
        return fallbackCode;
    }

    private boolean hasCause(Throwable error, Class<? extends Throwable> type) {
        Throwable current = error;
        while (current != null) {
            if (type.isInstance(current)) return true;
            current = current.getCause();
        }
        return false;
    }

    private String messageByPath(String path) {
        String normalizedPath = path == null ? "" : path.toLowerCase(Locale.ROOT);
        if (normalizedPath.contains("/rotas")) {
            return "Não foi possível calcular a rota agora. Tente novamente em instantes.";
        }
        if (normalizedPath.contains("/enderecos") || normalizedPath.contains("/cep")) {
            return "Não foi possível buscar o endereço agora. Confira os dados e tente novamente.";
        }
        if (normalizedPath.contains("/finance")) {
            return "Não foi possível carregar as informações financeiras agora. Tente novamente.";
        }
        if (normalizedPath.contains("/verification") || normalizedPath.contains("/recovery")) {
            return MSG_VERIFICATION_SEND_FAILED;
        }
        if (normalizedPath.contains("/servicos") || normalizedPath.contains("/availability")) {
            return "Não foi possível consultar a agenda agora. Tente novamente em instantes.";
        }
        return MSG_DEPENDENCY_RETRY;
    }

    private boolean isAdminPath(String path) {
        return path != null && path.startsWith("/api/admin");
    }

    private boolean isVerificationPath(String path) {
        if (path == null) return false;
        return path.contains("/verification") || path.contains("/recovery") || path.contains("/admin/auth");
    }

    private String validationMessageForField(String field, String defaultMessage) {
        if ("clientEmail".equals(field) || "email".equals(field)) return "Informe um e-mail válido.";
        if ("clientPhone".equals(field) || "phone".equals(field)) return "Informe um celular válido com DDD.";
        if ("clientCep".equals(field)) return "Informe um CEP com 8 números.";
        if ("clientFirstName".equals(field)) return "Informe seu primeiro nome.";
        if ("clientLastName".equals(field)) return "Informe pelo menos um sobrenome.";
        if ("clientCity".equals(field)) return "Informe a cidade do atendimento.";
        if ("clientState".equals(field)) return "Informe a UF com 2 letras.";
        if ("serviceNotes".equals(field)) return "Explique o serviço com pelo menos 10 caracteres.";
        if ("code".equals(field)) return "Informe o código de 3 dígitos.";

        return safeCustomerMessage(defaultMessage, MSG_VALIDATION);
    }

    private String safeCode(String code, String fallback) {
        if (code == null || code.isBlank()) {
            return fallback;
        }
        String trimmed = code.trim().toUpperCase(Locale.ROOT);
        if (!trimmed.matches("^[A-Z0-9_]+$")) {
            return fallback;
        }
        String normalized = normalize(trimmed);
        if (normalized.contains("supabase")
                || normalized.contains("database")
                || normalized.contains("upstream")
                || normalized.contains("dns")
                || normalized.contains("jwt")
                || normalized.contains("sql")
                || normalized.contains("timeout")
                || normalized.contains("provider")) {
            return fallback;
        }
        return trimmed;
    }

    private String safeCustomerMessage(String message, String fallback) {
        if (message == null || message.isBlank() || containsUnsafeCustomerTerm(message)) {
            return fallback;
        }
        return message.trim();
    }

    private Object safeDetails(Object details) {
        if (details == null) {
            return null;
        }
        return containsUnsafeCustomerTerm(String.valueOf(details)) ? null : details;
    }

    private boolean containsUnsafeCustomerTerm(String value) {
        return containsTechnicalDependencyTerm(normalize(value));
    }

    private boolean containsTechnicalDependencyTerm(String normalized) {
        return normalized.contains("supabase")
                || normalized.contains("database")
                || normalized.contains("stack")
                || normalized.contains("exception")
                || normalized.contains("upstream")
                || normalized.contains("dns")
                || normalized.contains("jwt")
                || normalized.contains("token")
                || normalized.contains("internal server error")
                || normalized.contains("sql")
                || normalized.contains("timeout")
                || normalized.contains("failed to fetch")
                || normalized.contains("api key")
                || normalized.contains("apikey")
                || normalized.contains("oauth")
                || normalized.contains("access_token")
                || normalized.contains("http")
                || normalized.contains("backend")
                || normalized.contains("geoapify")
                || normalized.contains("google")
                || normalized.contains("inter ")
                || normalized.contains("provedor")
                || normalized.contains("provider")
                || normalized.contains("servico externo")
                || normalized.contains("dependencia")
                || normalized.contains("ssl")
                || normalized.contains("host");
    }

    private String fieldLabel(String field) {
        if (field == null || field.isBlank()) return "os dados obrigatórios";
        return switch (field) {
            case "token" -> "o código de acesso";
            case "date" -> "a data";
            case "time" -> "o horário";
            case "phone", "clientPhone" -> "o telefone";
            case "code" -> "o código";
            case "city", "clientCity" -> "a cidade";
            default -> "o campo " + field;
        };
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .trim();
    }

    private void logDetailedBadRequest(DetailedBadRequestException ex, HttpServletRequest req) {
        log.warn(
                "Detailed bad request at {} code={} field={} details={} message={}",
                req.getRequestURI(),
                ex.getCode(),
                ex.getField() == null ? "n/a" : ex.getField(),
                safeDetailsForLog(ex.getDetails()),
                safeExceptionMessage(ex));
    }

    private String safeDetailsForLog(Object details) {
        return details == null ? "" : safeExceptionMessage(new RuntimeException(String.valueOf(details)));
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
