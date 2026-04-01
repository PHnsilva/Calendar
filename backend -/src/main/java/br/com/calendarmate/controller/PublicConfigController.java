package br.com.calendarmate.controller;

import br.com.calendarmate.dto.PublicBootstrapResponse;
import br.com.calendarmate.service.PublicConfigService;
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
