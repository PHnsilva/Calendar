package com.example.Calendar.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

public final class ScheduleRules {
    private final LocalDate cycleStart; // dia de trabalho (início do ciclo)

    public ScheduleRules(LocalDate cycleStart) {
        this.cycleStart = cycleStart;
    }

    public boolean isOffDay(LocalDate date) {
        long days = ChronoUnit.DAYS.between(cycleStart, date);
        long pos = Math.floorMod(days, 8); // evita bug com datas antes do start
        return pos >= 4; // 4 dias de folga
    }
}
