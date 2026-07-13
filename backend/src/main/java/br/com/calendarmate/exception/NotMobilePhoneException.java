package br.com.calendarmate.exception;

public class NotMobilePhoneException extends BadRequestException {
    public NotMobilePhoneException(String msg) {
        super(msg);
    }
}
