package com.example.Calendar.controller;

import com.example.Calendar.dto.VerifyConfirmRequest;
import com.example.Calendar.dto.VerifyConfirmResponse;
import com.example.Calendar.dto.VerifyResendRequest;
import com.example.Calendar.dto.VerifyStartRequest;
import com.example.Calendar.dto.VerifyStartResponse;
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
        VerificationService.StartResult r = verificationService.start(req.getToken(), req.getPhone());
        return new VerifyStartResponse(
                r.verificationId(),
                r.expiresInSeconds(),
                r.resendAfterSeconds()
        );
    }

    @PostMapping("/resend")
    public VerifyStartResponse resend(@Valid @RequestBody VerifyResendRequest req) {
        VerificationService.StartResult r = verificationService.resend(req.getVerificationId());
        return new VerifyStartResponse(
                r.verificationId(),
                r.expiresInSeconds(),
                r.resendAfterSeconds()
        );
    }

    @PostMapping("/confirm")
    public VerifyConfirmResponse confirm(@Valid @RequestBody VerifyConfirmRequest req) throws IOException {
        verificationService.confirm(req.getVerificationId(), req.getCode());
        return new VerifyConfirmResponse(true);
    }
}