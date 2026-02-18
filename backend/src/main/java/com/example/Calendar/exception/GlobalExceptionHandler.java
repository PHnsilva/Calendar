package com.example.Calendar.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String code, String message, HttpServletRequest req) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", code);
        body.put("message", message);
        body.put("path", req.getRequestURI());
        return ResponseEntity.status(status).body(body);
    }

    // --- Google / IO ---
    @ExceptionHandler(IOException.class)
    public ResponseEntity<?> handleIO(IOException ex, HttpServletRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_IO_ERROR",
                "Erro de comunicação com Google Calendar.", req);
    }

    // --- Param inválido (ex: date=abc em LocalDate) ---
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<?> handleTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest req) {
        String name = ex.getName();
        String msg = "Parâmetro inválido: " + name;
        if ("date".equals(name)) msg = "date deve estar no formato yyyy-MM-dd";
        if ("slotMinutes".equals(name)) msg = "slotMinutes deve ser um número inteiro";
        return build(HttpStatus.BAD_REQUEST, "INVALID_PARAM", msg, req);
    }

    // --- Body inválido (DTO validation: @NotBlank etc.) ---
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        // mensagem simples (se quiser, depois montamos lista de campos)
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Campos obrigatórios ausentes ou inválidos.", req);
    }

    // --- 400 padrão ---
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> handleBadRequest(IllegalArgumentException ex, HttpServletRequest req) {
        return build(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), req);
    }

    // --- 409 conflito (horário indisponível) ---
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<?> handleConflict(IllegalStateException ex, HttpServletRequest req) {
        return build(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), req);
    }

    // --- 403 (token/admin) ---
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<?> handleForbidden(SecurityException ex, HttpServletRequest req) {
        return build(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), req);
    }

    // --- fallback 500 ---
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneric(Exception ex, HttpServletRequest req) {
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Erro inesperado.", req);
    }
}
