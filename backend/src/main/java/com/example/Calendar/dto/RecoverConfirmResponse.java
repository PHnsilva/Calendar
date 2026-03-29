package com.example.Calendar.dto;

import java.util.List;

public class RecoverConfirmResponse {
    private boolean verified;
    private List<ServicoResponse> servicos;
    private List<String> tokens;
    private List<RecoveryBookingItemResponse> items;

    public RecoverConfirmResponse() {
    }

    public RecoverConfirmResponse(
            boolean verified,
            List<ServicoResponse> servicos,
            List<String> tokens,
            List<RecoveryBookingItemResponse> items
    ) {
        this.verified = verified;
        this.servicos = servicos;
        this.tokens = tokens;
        this.items = items;
    }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public List<ServicoResponse> getServicos() { return servicos; }
    public void setServicos(List<ServicoResponse> servicos) { this.servicos = servicos; }

    public List<String> getTokens() { return tokens; }
    public void setTokens(List<String> tokens) { this.tokens = tokens; }

    public List<RecoveryBookingItemResponse> getItems() { return items; }
    public void setItems(List<RecoveryBookingItemResponse> items) { this.items = items; }
}
