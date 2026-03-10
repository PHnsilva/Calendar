package com.example.Calendar.dto;

import java.time.Instant;
import java.util.List;

public class AvailabilityBlockPreviewResponse {
    private String type;
    private Instant start;
    private Instant end;
    private String reason;
    private int conflictCount;
    private List<AvailabilityConflictItem> conflicts;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Instant getStart() {
        return start;
    }

    public void setStart(Instant start) {
        this.start = start;
    }

    public Instant getEnd() {
        return end;
    }

    public void setEnd(Instant end) {
        this.end = end;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public int getConflictCount() {
        return conflictCount;
    }

    public void setConflictCount(int conflictCount) {
        this.conflictCount = conflictCount;
    }

    public List<AvailabilityConflictItem> getConflicts() {
        return conflicts;
    }

    public void setConflicts(List<AvailabilityConflictItem> conflicts) {
        this.conflicts = conflicts;
    }
}