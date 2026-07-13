package br.com.calendarmate.exception;

public class InvalidPhoneException extends BadRequestException {
    public InvalidPhoneException(String msg) {
        super(msg);
    }
}
