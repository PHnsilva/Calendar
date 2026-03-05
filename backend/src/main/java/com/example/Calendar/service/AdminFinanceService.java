package com.example.Calendar.service;

import com.example.Calendar.config.BankingProperties;
import com.example.Calendar.dto.AdminHealthResponse;
import com.example.Calendar.dto.AdminStatementItem;
import com.example.Calendar.dto.AdminStatementResponse;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.integrations.banking.StatementProvider;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

public class AdminFinanceService {

    private final BankingProperties props;
    private final StatementProvider provider;
    private final ZoneId zone = ZoneId.of("America/Sao_Paulo");

    public AdminFinanceService(BankingProperties props, StatementProvider provider) {
        this.props = props;
        this.provider = provider;
    }

    public AdminStatementResponse statement(String from, String to) {
        requireEnabled();

        LocalDate f = parseOr(from, LocalDate.now(zone).withDayOfMonth(1));
        LocalDate t = parseOr(to, LocalDate.now(zone));

        List<AdminStatementItem> items = provider.statement(f, t).stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return new AdminStatementResponse(items);
    }

    public AdminHealthResponse health() {
        if (!props.isEnabled()) return new AdminHealthResponse(true, provider.name(), "disabled->dummy");
        StatementProvider.Health h = provider.health();
        return new AdminHealthResponse(h.ok(), h.provider(), h.message());
    }

    private void requireEnabled() {
        if (!props.isEnabled()) throw new ForbiddenException("Banking desabilitado");
    }

    private AdminStatementItem toDto(StatementProvider.Item i) {
        AdminStatementItem d = new AdminStatementItem();
        d.setId(i.id());
        d.setDate(i.date());
        d.setDescription(i.description());
        d.setAmount(i.amount());
        return d;
    }

    private static LocalDate parseOr(String s, LocalDate def) {
        if (s == null || s.isBlank()) return def;
        return LocalDate.parse(s.trim());
    }
}