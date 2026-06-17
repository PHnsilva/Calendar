package br.com.calendarmate.verification.application;

import br.com.calendarmate.service.VerificationService;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Application seam for confirming client booking phone verification.
 */
@Service
public class ConfirmVerificationUseCase {
    private final VerificationService verificationService;

    public ConfirmVerificationUseCase(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    public void execute(String verificationId, String code) throws IOException {
        verificationService.confirm(verificationId, code);
    }
}
