package br.com.calendarmate.exception;

import java.time.Instant;

public class ApiError {
    private Instant timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private String field;
    private Object details;

    public ApiError() {}

    public ApiError(int status, String error, String message, String path) {
        this(status, error, message, path, null, null);
    }

    public ApiError(int status, String error, String message, String path, String field, Object details) {
        this.timestamp = Instant.now();
        this.status = status;
        this.error = error;
        this.message = message;
        this.path = path;
        this.field = field;
        this.details = details;
    }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public int getStatus() { return status; }
    public void setStatus(int status) { this.status = status; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }

    public String getField() { return field; }
    public void setField(String field) { this.field = field; }

    public Object getDetails() { return details; }
    public void setDetails(Object details) { this.details = details; }
}
