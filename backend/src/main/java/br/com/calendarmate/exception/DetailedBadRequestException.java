package br.com.calendarmate.exception;

public class DetailedBadRequestException extends BadRequestException {
    private final String code;
    private final String field;
    private final Object details;

    public DetailedBadRequestException(String code, String message, String field, Object details) {
        super(message);
        this.code = code == null || code.isBlank() ? "BAD_REQUEST" : code.trim();
        this.field = field == null || field.isBlank() ? null : field.trim();
        this.details = details;
    }

    public String getCode() {
        return code;
    }

    public String getField() {
        return field;
    }

    public Object getDetails() {
        return details;
    }
}
