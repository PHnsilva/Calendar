package br.com.calendarmate.dto;

import java.util.List;

public class AdminBulkCancelResponse {
    private int totalRequested;
    private int totalCancelled;
    private int totalFailed;
    private List<AdminBulkCancelItem> items;

    public int getTotalRequested() {
        return totalRequested;
    }

    public void setTotalRequested(int totalRequested) {
        this.totalRequested = totalRequested;
    }

    public int getTotalCancelled() {
        return totalCancelled;
    }

    public void setTotalCancelled(int totalCancelled) {
        this.totalCancelled = totalCancelled;
    }

    public int getTotalFailed() {
        return totalFailed;
    }

    public void setTotalFailed(int totalFailed) {
        this.totalFailed = totalFailed;
    }

    public List<AdminBulkCancelItem> getItems() {
        return items;
    }

    public void setItems(List<AdminBulkCancelItem> items) {
        this.items = items;
    }
}