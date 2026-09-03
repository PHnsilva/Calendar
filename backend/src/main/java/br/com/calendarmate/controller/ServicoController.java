package br.com.calendarmate.controller;

import br.com.calendarmate.booking.application.GetAvailableSlotsUseCase;
import br.com.calendarmate.dto.AdminAssignProviderRequest;
import br.com.calendarmate.dto.AdminServicoUpdateRequest;
import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.dto.PublicBookingCancellationRequest;
import br.com.calendarmate.dto.PublicBookingLookupRequest;
import br.com.calendarmate.dto.PublicBookingResponse;
import br.com.calendarmate.dto.ServicoCreateResponse;
import br.com.calendarmate.dto.ServicoRequest;
import br.com.calendarmate.dto.ServicoResponse;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.model.AdminPrincipal;
import br.com.calendarmate.model.AdminUser;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.ClientIpResolver;
import br.com.calendarmate.service.PublicBookingRateLimiter;
import br.com.calendarmate.service.ServicoService;
import br.com.calendarmate.service.TokenUtil;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/servicos")
public class ServicoController {

    private final ServicoService service;
    private final TokenUtil tokenUtil;
    private final AdminAuthService adminAuthService;
    private final GetAvailableSlotsUseCase getAvailableSlotsUseCase;
    private final PublicBookingRateLimiter publicBookingRateLimiter;
    private final ClientIpResolver clientIpResolver;

    public ServicoController(
            ServicoService service,
            TokenUtil tokenUtil,
            AdminAuthService adminAuthService,
            GetAvailableSlotsUseCase getAvailableSlotsUseCase,
            PublicBookingRateLimiter publicBookingRateLimiter,
            ClientIpResolver clientIpResolver) {
        this.service = service;
        this.tokenUtil = tokenUtil;
        this.adminAuthService = adminAuthService;
        this.getAvailableSlotsUseCase = getAvailableSlotsUseCase;
        this.publicBookingRateLimiter = publicBookingRateLimiter;
        this.clientIpResolver = clientIpResolver;
    }

    // PUBLIC

    @PostMapping
    public ResponseEntity<ServicoCreateResponse> create(@Valid @RequestBody ServicoRequest req) throws IOException {
        ServicoCreateResponse created = service.create(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/me")
    public ResponseEntity<ServicoResponse> getByToken(@RequestParam String token) throws IOException {
        return ResponseEntity.ok(service.getByToken(token));
    }

    @GetMapping("/my")
    public ResponseEntity<List<ServicoResponse>> listMy(@RequestParam String token) throws IOException {
        return ResponseEntity.ok(service.listMy(token));
    }

    @PutMapping("/me/{eventId}")
    public ResponseEntity<ServicoResponse> updateByToken(
            @PathVariable String eventId,
            @RequestParam String token,
            @Valid @RequestBody ServicoRequest req) throws IOException {

        return ResponseEntity.ok(service.updateByToken(eventId, token, req));
    }

    @DeleteMapping("/me/{eventId}")
    public ResponseEntity<Void> deleteByToken(
            @PathVariable String eventId,
            @RequestParam String token) throws IOException {

        service.cancelByToken(eventId, token);
        return ResponseEntity.ok().build();
    }

    // ADMIN

    @GetMapping("/admin")
    public ResponseEntity<List<ServicoResponse>> listAll(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city) throws IOException {

        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        return ResponseEntity.ok(service.listAllAdmin(principal, from, to, status, city));
    }

    @GetMapping("/admin/history")
    public ResponseEntity<List<ServicoResponse>> listHistory(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String city) throws IOException {

        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        if (!principal.isOwner()) {
            throw new ForbiddenException("Historico administrativo permitido apenas ao OWNER");
        }
        return ResponseEntity.ok(service.listHistoryAdmin(principal, from, to, status, city));
    }

    @DeleteMapping("/admin/{eventId}")
    public ResponseEntity<Void> adminDelete(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @PathVariable String eventId) throws IOException {

        adminAuthService.requireOwner(session, workspace, providerId);
        service.deleteByIdAdmin(eventId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/public/lookup")
    public ResponseEntity<List<PublicBookingResponse>> listPublicByPhone(
            @Valid @RequestBody PublicBookingLookupRequest body,
            HttpServletRequest request) throws IOException {
        String phone = br.com.calendarmate.util.PhoneNumberNormalizer.normalizeBrazilianMobilePhone(body.getPhone());
        publicBookingRateLimiter.checkLookup(clientIpResolver.resolve(request), phone);
        return ResponseEntity.ok(service.listPublicBookingsByPhone(phone));
    }

    @PostMapping("/public/cancel")
    public ResponseEntity<PublicBookingResponse> cancelPublicByPhone(
            @Valid @RequestBody PublicBookingCancellationRequest body,
            HttpServletRequest request) throws IOException {
        String phone = br.com.calendarmate.util.PhoneNumberNormalizer.normalizeBrazilianMobilePhone(body.getPhone());
        publicBookingRateLimiter.checkCancellation(clientIpResolver.resolve(request), phone);
        return ResponseEntity.ok(service.cancelPublicBooking(body.getEventId(), phone));
    }

    @GetMapping("/admin/{eventId}")
    public ResponseEntity<ServicoResponse> adminGetById(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @PathVariable String eventId) throws IOException {

        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        return ResponseEntity.ok(service.getByIdAdmin(eventId, principal));
    }

    @PutMapping("/admin/{eventId}")
    public ResponseEntity<ServicoResponse> adminUpdate(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @PathVariable String eventId,
            @Valid @RequestBody AdminServicoUpdateRequest req) throws IOException {

        AdminPrincipal principal = adminAuthService.require(session, workspace, providerId);
        return ResponseEntity.ok(service.updateByIdAdmin(eventId, principal, req));
    }

    @PutMapping("/admin/{eventId}/assignee")
    public ResponseEntity<ServicoResponse> assignProvider(
            @RequestHeader(value = "X-ADMIN-SESSION", required = false) String session,
            @RequestHeader(value = "X-ADMIN-WORKSPACE", required = false) String workspace,
            @RequestHeader(value = "X-ADMIN-PROVIDER-ID", required = false) String providerId,
            @PathVariable String eventId,
            @Valid @RequestBody AdminAssignProviderRequest req) throws IOException {

        adminAuthService.requireOwner(session, workspace, providerId);
        AdminUser provider = adminAuthService.requireAssignableProvider(req.getProviderId());
        return ResponseEntity.ok(service.assignProviderAdmin(eventId, provider));
    }

    // AVAILABLE
    @GetMapping("/available")
    public ResponseEntity<List<AvailableSlotResponse>> getAvailable(
            @RequestParam LocalDate date,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "60") int slotMinutes) throws IOException {

        return ResponseEntity.ok(getAvailableSlotsUseCase.execute(date, city, slotMinutes));
    }
}
