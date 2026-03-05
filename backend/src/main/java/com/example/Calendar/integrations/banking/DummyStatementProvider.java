package com.example.Calendar.integrations.banking;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class DummyStatementProvider implements StatementProvider {

    @Override
    public String name() { return "DUMMY"; }

    @Override
    public List<Item> statement(LocalDate from, LocalDate to) {
        LocalDate f = from == null ? LocalDate.now().minusDays(7) : from;
        LocalDate t = to == null ? LocalDate.now() : to;
        int n = Math.max(1, Math.min(40, (int) (t.toEpochDay() - f.toEpochDay() + 1)));

        return IntStream.range(0, n)
                .mapToObj(i -> f.plusDays(i))
                .flatMap(d -> IntStream.range(0, d.getDayOfMonth() % 3 + 1).mapToObj(k -> mk(d, k)))
                .collect(Collectors.toList());
    }

    @Override
    public Health health() {
        return new Health(true, name(), "ok");
    }

    private Item mk(LocalDate d, int k) {
        String id = "dummy-" + UUID.nameUUIDFromBytes((d.toString() + ":" + k).getBytes());
        String date = d.toString();
        String desc = "PIX recebido (dummy) " + (k + 1);
        String amount = "R$ " + (100 + (d.getDayOfMonth() * 7) + (k * 25)) + ",00";
        return new Item(id, date, desc, amount);
    }
}