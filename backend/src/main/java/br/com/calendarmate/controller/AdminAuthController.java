package br.com.calendarmate.controller;

import br.com.calendarmate.dto.AdminAuthConfirmRequest;
import br.com.calendarmate.dto.AdminAuthConfirmResponse;
import br.com.calendarmate.dto.AdminAuthStartRequest;
import br.com.calendarmate.dto.AdminAuthStartResponse;
import br.com.calendarmate.dto.AdminMeResponse;
import br.com.calendarmate.dto.AdminPasswordLoginRequest;
import br.com.calendarmate.dto.AdminProviderResponse;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.service.AdminAuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {
    private final AdminAuthService adminAuthService;

    public AdminAuthController(AdminAuthService adminAuthService) {
        this.adminAuthService = adminAuthService;
    }

    @PostMapping("/start")
    public AdminAuthStartResponse start(@Valid @RequestBody AdminAuthStartRequest req) {
        return adminAuthService.start(req.getPhone());
    }

    @PostMapping("/resend")
    public AdminAuthStartResponse resend(@RequestParam String verificationId) {
        return adminAuthService.resend(verificationId);
    }

    @PostMapping("/confirm")
    public AdminAuthConfirmResponse confirm(@Valid @RequestBody AdminAuthConfirmRequest req) {
        return adminAuthService.confirm(req.getVerificationId(), req.getCode());
    }

    @PostMapping("/password")
    public AdminAuthConfirmResponse password(@Valid @RequestBody AdminPasswordLoginRequest req) {
        return adminAuthService.passwordLogin(req.getPhone(), req.getPassword());
    }

    @GetMapping("/me")
    public AdminMeResponse me(@RequestHeader(value = "X-ADMIN-SESSION", required = false) String session) {
        return adminAuthService.toMe(adminAuthService.require(session));
    }

    @PostMapping("/logout")
    public void logout(@RequestHeader(value = "X-ADMIN-SESSION", required = false) String session) {
        adminAuthService.logout(session);
    }

    @GetMapping("/providers")
    public List<AdminProviderResponse> providers(@RequestHeader(value = "X-ADMIN-SESSION", required = false) String session) {
        AdminPrincipal principal = adminAuthService.require(session);
        return adminAuthService.listProviders(principal);
    }
}
