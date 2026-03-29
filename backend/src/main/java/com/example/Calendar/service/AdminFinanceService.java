package com.example.Calendar.service;

import com.example.Calendar.config.AppProperties;
import com.example.Calendar.config.BankingProperties;
import com.example.Calendar.dto.AdminHealthResponse;
import com.example.Calendar.dto.AdminStatementItem;
import com.example.Calendar.dto.AdminStatementResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.integrations.banking.StatementProvider;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.stream.Collectors;

public class AdminFinanceService {

    private final BankingProperties props;
    private final StatementProvider provider;
    private final AppProperties appProperties;

    public AdminFinanceService(BankingProperties props, StatementProvider provider, AppProperties appProperties) {
        this.props = props;
        this.provider = provider;
        this.appProperties = appProperties;
    }

    public AdminStatementResponse statement(String from, String to) {
        requireEnabled();

        LocalDate today = LocalDate.now(zone());
        LocalDate minHistoryDate = today
                .withDayOfMonth(1)
                .minusMonths(appProperties.getHistoryRetentionMonths());

        LocalDate f = parseOr(from, today.withDayOfMonth(1));
        LocalDate t = parseOr(to, today);

        if (f.isBefore(minHistoryDate)) {
            f = minHistoryDate;
        }
        if (t.isBefore(minHistoryDate)) {
            t = minHistoryDate;
        }
        if (t.isAfter(today)) {
            t = today;
        }

        if (f.isAfter(t)) {
            throw new BadRequestException("Parâmetros inválidos: from deve ser <= to");
        }

        List<AdminStatementItem> items = provider.statement(f, t).stream()
                .map(this::toDto)
                .collect(Collectors.toList());

        return new AdminStatementResponse(items);
    }

    public AdminHealthResponse health() {
        if (!props.isEnabled()) {
            return new AdminHealthResponse(true, provider.name(), "disabled->dummy");
        }

        StatementProvider.Health h = provider.health();
        return new AdminHealthResponse(h.ok(), h.provider(), h.message());
    }

    private void requireEnabled() {
        if (!props.isEnabled()) {
            throw new ForbiddenException("Banking desabilitado");
        }
    }

    private AdminStatementItem toDto(StatementProvider.Item i) {
        AdminStatementItem d = new AdminStatementItem();
        d.setId(i.id());
        d.setDate(i.date());
        d.setDescription(i.description());
        d.setAmount(i.amount());
        d.setAmountCents(parseAmountToCents(i.amount()));
        return d;
    }

    private static LocalDate parseOr(String s, LocalDate def) {
        if (s == null || s.isBlank()) {
            return def;
        }
        return LocalDate.parse(s.trim());
    }

    private long parseAmountToCents(String raw) {
        if (raw == null || raw.isBlank()) {
            return 0L;
        }

        String s = raw.trim();
        boolean negative = s.startsWith("-") || (s.contains("(") && s.contains(")"));

        s = s.replace("R$", "")
                .replace("r$", "")
                .replace("(", "")
                .replace(")", "")
                .replaceAll("\\s+", "")
                .replaceAll("[^0-9,.-]", "");

        if (s.isBlank()) {
            return 0L;
        }

        if (s.startsWith("-")) {
            s = s.substring(1);
        }
        s = s.replace("-", "");

        char decimalSep = detectDecimalSeparator(s);
        String normalized;

        if (decimalSep == ',') {
            normalized = s.replace(".", "").replace(",", ".");
        } else if (decimalSep == '.') {
            normalized = s.replace(",", "");
        } else {
            normalized = s.replace(".", "").replace(",", "") + ".00";
        }

        BigDecimal value = new BigDecimal(normalized).setScale(2, RoundingMode.HALF_UP);
        long cents = value.movePointRight(2).longValue();

        return negative ? -cents : cents;
    }

    private char detectDecimalSeparator(String s) {
        int lastComma = s.lastIndexOf(',');
        int lastDot = s.lastIndexOf('.');

        if (lastComma >= 0 && lastDot >= 0) {
            return lastComma > lastDot ? ',' : '.';
        }

        if (lastComma >= 0) {
            int digitsAfter = s.length() - lastComma - 1;
            return (digitsAfter >= 1 && digitsAfter <= 2) ? ',' : 0;
        }

        if (lastDot >= 0) {
            int digitsAfter = s.length() - lastDot - 1;
            return (digitsAfter >= 1 && digitsAfter <= 2) ? '.' : 0;
        }

        return 0;
    }

    private ZoneId zone() {
        return appProperties.getZoneId();
    }
}
