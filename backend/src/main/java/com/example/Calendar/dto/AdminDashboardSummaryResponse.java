package com.example.Calendar.dto;

public class AdminDashboardSummaryResponse {
    private int totalBookings;
    private int pendingBookings;
    private int confirmedBookings;
    private int otherBookings;
    private long totalAmountCents;
    private int totalBlocks;

    public int getTotalBookings() {
        return totalBookings;
    }

    public void setTotalBookings(int totalBookings) {
        this.totalBookings = totalBookings;
    }

    public int getPendingBookings() {
        return pendingBookings;
    }

    public void setPendingBookings(int pendingBookings) {
        this.pendingBookings = pendingBookings;
    }

    public int getConfirmedBookings() {
        return confirmedBookings;
    }

    public void setConfirmedBookings(int confirmedBookings) {
        this.confirmedBookings = confirmedBookings;
    }

    public int getOtherBookings() {
        return otherBookings;
    }

    public void setOtherBookings(int otherBookings) {
        this.otherBookings = otherBookings;
    }

    public long getTotalAmountCents() {
        return totalAmountCents;
    }

    public void setTotalAmountCents(long totalAmountCents) {
        this.totalAmountCents = totalAmountCents;
    }

    public int getTotalBlocks() {
        return totalBlocks;
    }

    public void setTotalBlocks(int totalBlocks) {
        this.totalBlocks = totalBlocks;
    }
}