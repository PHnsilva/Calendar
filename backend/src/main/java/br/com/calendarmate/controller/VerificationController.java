package br.com.calendarmate.controller;

import br.com.calendarmate.dto.VerifyConfirmRequest;
import br.com.calendarmate.dto.VerifyConfirmResponse;
import br.com.calendarmate.dto.VerifyResendRequest;
import br.com.calendarmate.dto.VerifyStartRequest;
import br.com.calendarmate.dto.VerifyStartResponse;
import br.com.calendarmate.service.VerificationService;
import br.com.calendarmate.verification.application.ConfirmVerificationUseCase;
import br.com.calendarmate.verification.application.StartVerificationUseCase;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("/api/verify")
public class VerificationController {

    private final VerificationService verificationService;
    private final StartVerificationUseCase startVerificationUseCase;
    private final ConfirmVerificationUseCase confirmVerificationUseCase;

    public VerificationController(
            VerificationService verificationService,
            StartVerificationUseCase startVerificationUseCase,
            ConfirmVerificationUseCase confirmVerificationUseCase) {
        this.verificationService = verificationService;
        this.startVerificationUseCase = startVerificationUseCase;
        this.confirmVerificationUseCase = confirmVerificationUseCase;
    }

    @PostMapping("/start")
    public VerifyStartResponse start(@Valid @RequestBody VerifyStartRequest req) throws IOException {
        StartVerificationUseCase.Result r = startVerificationUseCase.execute(req.getToken(), req.getPhone());
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
        confirmVerificationUseCase.execute(req.getVerificationId(), req.getCode());
        return new VerifyConfirmResponse(true);
    }
}
