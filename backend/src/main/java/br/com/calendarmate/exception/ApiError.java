package br.com.calendarmate.exception;

import java.time.Instant;

public class ApiError {
    private Instant timestamp;
    private int status;
    private String code;
    private String error;
    private String message;
    private String path;
    private boolean retryable;
    private String field;
    private Object details;

    public ApiError() {}

    public ApiError(int status, String error, String message, String path) {
        this(status, error, message, path, false, null, null);
    }

    public ApiError(int status, String error, String message, String path, String field, Object details) {
        this(status, error, message, path, false, field, details);
    }

    public ApiError(int status, String code, String message, String path, boolean retryable, String field, Object details) {
        this.timestamp = Instant.now();
        this.status = status;
        this.code = code;
        this.error = code;
        this.message = message;
        this.path = path;
        this.retryable = retryable;
        this.field = field;
        this.details = details;
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getCode() { return code; }
    public void setCode(String code) {
        this.code = code;
        this.error = code;
    }

    public String getError() { return error; }
    public void setError(String error) {
        this.error = error;
        if (this.code == null || this.code.isBlank()) {
            this.code = error;
        }
    }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public boolean isRetryable() { return retryable; }
    public void setRetryable(boolean retryable) { this.retryable = retryable; }

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public Object getDetails() { return details; }
    public void setDetails(Object details) { this.details = details; }
}
