package com.example.Calendar.controller;

import com.example.Calendar.dto.CepLookupResponse;
import com.example.Calendar.service.CepService;
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