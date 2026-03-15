package com.example.Calendar.dto;

import java.util.List;

public class AdminBulkCancelRequest {
    private List<String> eventIds;
    private String reason;

    public List<String> getEventIds() {
        return eventIds;
    }

    public void setEventIds(List<String> eventIds) {
        this.eventIds = eventIds;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}