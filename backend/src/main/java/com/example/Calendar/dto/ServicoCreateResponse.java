package com.example.Calendar.dto;

public class ServicoCreateResponse {
    private ServicoResponse servico;
    private String manageToken;

    public ServicoCreateResponse() {}

    public ServicoCreateResponse(ServicoResponse servico, String manageToken) {
        this.servico = servico;
        this.manageToken = manageToken;
    }

    public ServicoResponse getServico() { return servico; }
    public void setServico(ServicoResponse servico) { this.servico = servico; }

    public String getManageToken() { return manageToken; }
    public void setManageToken(String manageToken) { this.manageToken = manageToken; }
}
