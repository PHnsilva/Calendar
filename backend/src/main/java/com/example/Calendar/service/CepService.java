package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.dto.CepLookupResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.util.LocationNormalizer;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public class CepService {

    private final RestTemplate http;
    private final AppProperties props;

    public CepService(RestTemplate http, AppProperties props) {
        this.http = http;
        this.props = props;
    }

    public CepLookupResponse lookup(String cepRaw) {
        String cep = digitsOnly(cepRaw);

        // CEP deve ter 8 dígitos
        if (!cep.matches("\\d{8}")) {
            throw new BadRequestException("CEP deve ter 8 dígitos (somente números)");
        }

        Map<String, Object> data = fetchViaCep(cep);

        // ViaCEP sinaliza erro com {"erro": true}
        Object erro = data.get("erro");
        if (erro instanceof Boolean && (Boolean) erro) {
            throw new BadRequestException("CEP não encontrado");
        }
        if (erro instanceof String && "true".equalsIgnoreCase((String) erro)) {
            throw new BadRequestException("CEP não encontrado");
        }

        String uf = str(data.get("uf"));
        String localidade = str(data.get("localidade"));
        String logradouro = str(data.get("logradouro"));
        String bairro = str(data.get("bairro"));

        // Trava UF (config genérica)
        validateAllowedState(uf);

        // Trava cidade (config genérica)
        validateAllowedCity(localidade);

        return new CepLookupResponse(
                cep,
                logradouro,
                bairro,
                localidade,
                uf,
                str(data.get("ibge")),
                str(data.get("gia")),
                str(data.get("ddd")),
                str(data.get("siafi")));
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fetchViaCep(String cep) {
        String url = "https://viacep.com.br/ws/" + cep + "/json/";
        try {
            Object res = http.getForObject(url, Object.class);
            if (!(res instanceof Map)) {
                throw new BadRequestException("Resposta inválida do serviço de CEP");
            }
            return (Map<String, Object>) res;
        } catch (RestClientException e) {
            throw new BadRequestException("Falha ao consultar CEP");
        }
    }

    private void validateAllowedState(String ufFromApi) {
        String uf = LocationNormalizer.normalizeState(ufFromApi);

        Set<String> allowedStates = props.getAllowedStatesUpper();
        if (!allowedStates.isEmpty()) {
            if (uf.isBlank() || !allowedStates.contains(uf)) {
                throw new BadRequestException("Atendimento não disponível para este estado");
            }
        }
    }

    private void validateAllowedCity(String cityFromApi) {
        String city = LocationNormalizer.normalizeCity(cityFromApi);

        Set<String> allowedCities = props.getAllowedCitiesNormalized();
        if (!allowedCities.isEmpty()) {
            if (city.isBlank() || !allowedCities.contains(city)) {
                throw new BadRequestException("Atendimento não disponível para esta cidade");
            }
            return;
        }

        // fallback legado (single city)
        String legacyCity = props.getLegacyCityNormalized();
        if (!legacyCity.isBlank()) {
            if (city.isBlank() || !legacyCity.equals(city)) {
                throw new BadRequestException("Atendimento não disponível para esta cidade");
            }
        }
    }

    private String digitsOnly(String s) {
        return (s == null) ? "" : s.replaceAll("\\D", "");
    }

    private String str(Object o) {
        return o == null ? "" : String.valueOf(o);
    }
}