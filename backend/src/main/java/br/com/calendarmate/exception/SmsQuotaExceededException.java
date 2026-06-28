package br.com.calendarmate.exception;

public class SmsQuotaExceededException extends RuntimeException {
    public SmsQuotaExceededException(String msg) {
        super(msg);
    }
}
