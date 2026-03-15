package com.example.Calendar.service;

import com.example.Calendar.dto.AdminDashboardSummaryResponse;
import com.example.Calendar.dto.AdminStatementItem;
import com.example.Calendar.dto.AdminStatementResponse;
import com.example.Calendar.dto.ServicoResponse;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;

@Service
public class AdminDashboardService {

    private final ServicoService servicoService;
    private final AvailabilityBlockService availabilityBlockService;
    private final AdminFinanceService adminFinanceService;

    public AdminDashboardService(
            ServicoService servicoService,
            AvailabilityBlockService availabilityBlockService,
            AdminFinanceService adminFinanceService
    ) {
        this.servicoService = servicoService;
        this.availabilityBlockService = availabilityBlockService;
        this.adminFinanceService = adminFinanceService;
    }

    public AdminDashboardSummaryResponse summary(LocalDate from, LocalDate to, String status, String city) throws IOException {
        List<ServicoResponse> bookings = servicoService.listAllAdmin(from, to, status, city);
        int totalBookings = bookings.size();

        int pendingBookings = 0;
        int confirmedBookings = 0;
        int otherBookings = 0;

        for (ServicoResponse booking : bookings) {
            String currentStatus = booking.getStatus() == null ? "" : booking.getStatus().trim().toUpperCase(Locale.ROOT);
            if ("PENDING_PHONE".equals(currentStatus)) {
                pendingBookings++;
            } else if ("CONFIRMED".equals(currentStatus)) {
                confirmedBookings++;
            } else {
                otherBookings++;
            }
        }

        long totalAmountCents = 0L;
        try {
            String fromStr = from == null ? null : from.toString();
            String toStr = to == null ? null : to.toString();
            AdminStatementResponse statement = adminFinanceService.statement(fromStr, toStr);

            if (statement != null && statement.getItems() != null) {
                for (AdminStatementItem item : statement.getItems()) {
                    totalAmountCents += item.getAmountCents();
                }
            }
        } catch (Exception ignored) {
        }

        int totalBlocks = availabilityBlockService.list(from, to).size();

        AdminDashboardSummaryResponse out = new AdminDashboardSummaryResponse();
        out.setTotalBookings(totalBookings);
        out.setPendingBookings(pendingBookings);
        out.setConfirmedBookings(confirmedBookings);
        out.setOtherBookings(otherBookings);
        out.setTotalAmountCents(totalAmountCents);
        out.setTotalBlocks(totalBlocks);

        return out;
    }
}