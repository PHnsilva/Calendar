package br.com.calendarmate.dto;

public class CepLookupResponse {
    private String cep;           // 8 dígitos
    private String street;        // logradouro
    private String neighborhood;  // bairro
    private String city;          // localidade
    private String state;         // uf
    private String ibge;          // opcional
    private String gia;           // opcional
    private String ddd;           // opcional
    private String siafi;         // opcional

    public CepLookupResponse() {}

    public CepLookupResponse(
            String cep,
            String street,
            String neighborhood,
            String city,
            String state,
            String ibge,
            String gia,
            String ddd,
            String siafi
    ) {
        this.cep = cep;
        this.street = street;
        this.neighborhood = neighborhood;
        this.city = city;
        this.state = state;
        this.ibge = ibge;
        this.gia = gia;
        this.ddd = ddd;
        this.siafi = siafi;
    }

    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }

    public String getStreet() { return street; }
    public void setStreet(String street) { this.street = street; }

    public String getNeighborhood() { return neighborhood; }
    public void setNeighborhood(String neighborhood) { this.neighborhood = neighborhood; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getIbge() { return ibge; }
    public void setIbge(String ibge) { this.ibge = ibge; }

    public String getGia() { return gia; }
    public void setGia(String gia) { this.gia = gia; }

    public String getDdd() { return ddd; }
    public void setDdd(String ddd) { this.ddd = ddd; }

    public String getSiafi() { return siafi; }
    public void setSiafi(String siafi) { this.siafi = siafi; }
}