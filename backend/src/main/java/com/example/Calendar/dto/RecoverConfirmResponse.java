package com.example.Calendar.dto;

import java.util.List;

public class RecoverConfirmResponse {
    private boolean verified;
    private List<ServicoResponse> servicos;

    public RecoverConfirmResponse() {}

    public RecoverConfirmResponse(boolean verified, List<ServicoResponse> servicos) {
        this.verified = verified;
        this.servicos = servicos;
    }

    public boolean isVerified() { return verified; }
    public void setVerified(boolean verified) { this.verified = verified; }

    public List<ServicoResponse> getServicos() { return servicos; }
    public void setServicos(List<ServicoResponse> servicos) { this.servicos = servicos; }
}