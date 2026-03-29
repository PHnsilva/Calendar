package com.example.Calendar.controller;

import com.example.Calendar.dto.RecoverConfirmRequest;
import com.example.Calendar.dto.RecoverConfirmResponse;
import com.example.Calendar.dto.RecoverResendRequest;
import com.example.Calendar.dto.RecoverStartRequest;
import com.example.Calendar.dto.RecoverStartResponse;
import com.example.Calendar.service.RecoveryService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/recovery")
public class RecoveryController {

    private final RecoveryService recoveryService;

    public RecoveryController(RecoveryService recoveryService) {
        this.recoveryService = recoveryService;
    }

    @PostMapping("/start")
    public RecoverStartResponse start(@Valid @RequestBody RecoverStartRequest req) {
        RecoveryService.StartResult r = recoveryService.start(req.getPhone());
        return new RecoverStartResponse(
                r.verificationId(),
                r.expiresInSeconds(),
                r.resendAfterSeconds()
        );
    }

    @PostMapping("/resend")
    public RecoverStartResponse resend(@Valid @RequestBody RecoverResendRequest req) {
        RecoveryService.StartResult r = recoveryService.resend(req.getVerificationId());
        return new RecoverStartResponse(
                r.verificationId(),
                r.expiresInSeconds(),
                r.resendAfterSeconds()
        );
    }

    @PostMapping("/confirm")
    public RecoverConfirmResponse confirm(@Valid @RequestBody RecoverConfirmRequest req) throws IOException {
        return recoveryService.confirm(req.getVerificationId(), req.getCode());
    }
}
