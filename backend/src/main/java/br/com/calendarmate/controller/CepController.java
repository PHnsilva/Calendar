package br.com.calendarmate.controller;

import br.com.calendarmate.dto.CepLookupResponse;
import br.com.calendarmate.service.CepService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cep")
public class CepController {

    private final CepService cepService;

    public CepController(CepService cepService) {
        this.cepService = cepService;
    }

    @GetMapping("/{cep}")
    public CepLookupResponse lookup(@PathVariable String cep) {
        return cepService.lookup(cep);
    }
}