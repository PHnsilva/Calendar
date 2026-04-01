package br.com.calendarmate.integrations.banking;

import java.time.LocalDate;
import java.util.List;

public interface StatementProvider {

    record Item(String id, String date, String description, String amount) {}

    record Health(boolean ok, String provider, String message) {}

    String name();

    List<Item> statement(LocalDate from, LocalDate to);

    Health health();
}