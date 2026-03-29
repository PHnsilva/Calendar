package br.com.calendarmate.dto;

import java.util.List;

public class AdminStatementResponse {
    private List<AdminStatementItem> items;

    public AdminStatementResponse() {}

    public AdminStatementResponse(List<AdminStatementItem> items) {
        this.items = items;
    }

    public List<AdminStatementItem> getItems() { return items; }
    public void setItems(List<AdminStatementItem> items) { this.items = items; }
}