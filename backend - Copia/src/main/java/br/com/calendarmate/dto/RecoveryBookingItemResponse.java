package br.com.calendarmate.dto;

public class RecoveryBookingItemResponse {
    private ServicoResponse servico;
    private String manageToken;

    public RecoveryBookingItemResponse() {
    }

    public RecoveryBookingItemResponse(ServicoResponse servico, String manageToken) {
        this.servico = servico;
        this.manageToken = manageToken;
    }

    public ServicoResponse getServico() {
        return servico;
    }

    public void setServico(ServicoResponse servico) {
        this.servico = servico;
    }

    public String getManageToken() {
        return manageToken;
    }

    public void setManageToken(String manageToken) {
        this.manageToken = manageToken;
    }
}
