package com.example.Calendar.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.time.LocalDateTime;

public class AvailabilityBlockCreateRequest {

    @NotBlank
    private String type;

    private LocalDate date;
    private LocalDateTime startAt;
    private LocalDateTime endAt;
    private String reason;
    private Boolean cancelConflictingBookings;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public LocalDateTime getStartAt() {
        return startAt;
    }

    public void setStartAt(LocalDateTime startAt) {
        this.startAt = startAt;
    }

    public LocalDateTime getEndAt() {
        return endAt;
    }

    public void setEndAt(LocalDateTime endAt) {
        this.endAt = endAt;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public Boolean getCancelConflictingBookings() {
        return cancelConflictingBookings;
    }

    public void setCancelConflictingBookings(Boolean cancelConflictingBookings) {
        this.cancelConflictingBookings = cancelConflictingBookings;
    }
}