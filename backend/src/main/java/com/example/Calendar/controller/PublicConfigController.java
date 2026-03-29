package com.example.Calendar.controller;

import com.example.Calendar.dto.PublicBootstrapResponse;
import com.example.Calendar.service.PublicConfigService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicConfigController {

    private final PublicConfigService publicConfigService;

    public PublicConfigController(PublicConfigService publicConfigService) {
        this.publicConfigService = publicConfigService;
    }

    @GetMapping("/bootstrap")
    public PublicBootstrapResponse bootstrap() {
        return publicConfigService.bootstrap();
    }
}
