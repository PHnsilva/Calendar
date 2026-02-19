package com.example.Calendar.exception;

public class BadRequestException extends RuntimeException {
    public BadRequestException(String msg) { super(msg); }
}
