package br.com.calendarmate.dto;

public class AvailableSlotResponse {
    private String date;
    private String startTime;
    private String endTime;
    private int durationMinutes;

    public AvailableSlotResponse() {
    }

    public AvailableSlotResponse(String date, String startTime, String endTime, int durationMinutes) {
        this.date = date;
        this.startTime = startTime;
        this.endTime = endTime;
        this.durationMinutes = durationMinutes;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public int getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(int durationMinutes) { this.durationMinutes = durationMinutes; }
}
