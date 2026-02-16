package com.example.calendar.model;

import java.time.Instant;

public class Servico {
    private String id;
    private String title;
    private String description;
    private Instant start;
    private Instant end;
    private String status; // "AGENDADO", "CANCELADO"

    public Servico() {}
    public Servico(String id, String title, String description, Instant start, Instant end, String status) {
        this.id=id; this.title=title; this.description=description; this.start=start; this.end=end; this.status=status;
    }
    // getters + setters (omitted for brevity)
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Instant getStart() { return start; }
    public void setStart(Instant start) { this.start = start; }
    public Instant getEnd() { return end; }
    public void setEnd(Instant end) { this.end = end; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
