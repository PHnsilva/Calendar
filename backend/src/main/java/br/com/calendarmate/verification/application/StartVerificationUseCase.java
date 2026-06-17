package br.com.calendarmate.verification.application;

import br.com.calendarmate.service.VerificationService;
import org.springframework.stereotype.Service;

import java.io.IOException;

/**
 * Application seam for starting client booking phone verification.
 */
@Service
public class StartVerificationUseCase {
    private final VerificationService verificationService;

    public StartVerificationUseCase(VerificationService verificationService) {
        this.verificationService = verificationService;
    }

    public VerificationService.StartResult execute(String token, String phone) throws IOException {
        return verificationService.start(token, phone);
    }
}
