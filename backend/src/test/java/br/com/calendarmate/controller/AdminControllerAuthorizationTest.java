package br.com.calendarmate.controller;

import br.com.calendarmate.booking.application.GetAvailableSlotsUseCase;
import br.com.calendarmate.dto.AdminAssignProviderRequest;
import br.com.calendarmate.dto.AdminBulkCancelRequest;
import br.com.calendarmate.exception.ForbiddenException;
import br.com.calendarmate.service.AdminAuthService;
import br.com.calendarmate.service.AdminBookingOpsService;
import br.com.calendarmate.service.AdminFinanceService;
import br.com.calendarmate.service.AvailabilityBlockService;
import br.com.calendarmate.service.ClientIpResolver;
import br.com.calendarmate.service.PublicBookingRateLimiter;
import br.com.calendarmate.service.ServicoService;
import br.com.calendarmate.service.TokenUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class AdminControllerAuthorizationTest {
    private static final String PROVIDER_SESSION = "provider-session";

    private AdminAuthService adminAuthService;

    @BeforeEach
    void rejectProviderAtOwnerBoundary() {
        adminAuthService = mock(AdminAuthService.class);
        when(adminAuthService.requireOwner(PROVIDER_SESSION))
                .thenThrow(new ForbiddenException("Acesso permitido apenas ao OWNER"));
        when(adminAuthService.requireOwner(PROVIDER_SESSION, null, null))
                .thenThrow(new ForbiddenException("Acesso permitido apenas ao OWNER"));
    }

    @Test
    void providerCannotRunBulkCancellation() {
        AdminBookingOpsService service = mock(AdminBookingOpsService.class);
        AdminBookingOpsController controller = new AdminBookingOpsController(service, adminAuthService);

        assertThrows(ForbiddenException.class, () -> controller.bulkCancel(PROVIDER_SESSION, null, null, new AdminBulkCancelRequest()));
        verifyNoInteractions(service);
    }

    @Test
    void providerCannotListAvailabilityBlocks() {
        AvailabilityBlockService service = mock(AvailabilityBlockService.class);
        AdminAvailabilityBlockController controller = new AdminAvailabilityBlockController(service, adminAuthService);

        assertThrows(ForbiddenException.class, () -> controller.list(PROVIDER_SESSION, null, null, null, null, null, null, null));
        verifyNoInteractions(service);
    }

    @Test
    void providerCannotReadFinanceHealth() {
        AdminFinanceService service = mock(AdminFinanceService.class);
        AdminFinanceController controller = new AdminFinanceController(service, adminAuthService);

        assertThrows(ForbiddenException.class, () -> controller.health(PROVIDER_SESSION, null, null));
        verifyNoInteractions(service);
    }

    @Test
    void providerCannotDeleteOrAssignBookings() {
        ServicoService service = mock(ServicoService.class);
        ServicoController controller = new ServicoController(
                service,
                mock(TokenUtil.class),
                adminAuthService,
                mock(GetAvailableSlotsUseCase.class),
                mock(PublicBookingRateLimiter.class),
                mock(ClientIpResolver.class));
        AdminAssignProviderRequest assignment = new AdminAssignProviderRequest();
        assignment.setProviderId("provider-2");

        assertThrows(ForbiddenException.class, () -> controller.adminDelete(PROVIDER_SESSION, null, null, "event-1"));
        assertThrows(ForbiddenException.class, () -> controller.assignProvider(PROVIDER_SESSION, null, null, "event-1", assignment));
        verifyNoInteractions(service);
    }
}
