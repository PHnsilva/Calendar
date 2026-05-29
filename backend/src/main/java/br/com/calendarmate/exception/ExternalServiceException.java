package br.com.calendarmate.exception;

public class ExternalServiceException extends RuntimeException {
    public ExternalServiceException(String msg, Throwable cause) {
        super(msg, cause);
    }
}
