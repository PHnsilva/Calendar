package com.example.Calendar.controller;

import com.example.Calendar.dto.*;
import com.example.Calendar.service.VerificationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private final VerificationService verificationService;

    public VerificationController(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    @PostMapping("/start")
    public VerifyStartResponse start(@Valid @RequestBody VerifyStartRequest req) throws IOException {
        var r = verificationService.start(req.getToken(), req.getPhone());
        return new VerifyStartResponse(r.verificationId(), r.expiresInSeconds(), r.resendAfterSeconds());
    }

    @PostMapping("/confirm")
    public VerifyConfirmResponse confirm(@Valid @RequestBody VerifyConfirmRequest req) throws IOException {
        verificationService.confirm(req.getVerificationId(), req.getCode());
        return new VerifyConfirmResponse(true);
    }
}