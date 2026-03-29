package br.com.calendarmate.dto;

import java.util.List;

public class PublicBootstrapResponse {
    private String timezone;
    private ScheduleConfig schedule;
    private BookingConfig booking;
    private VerificationConfig verification;
    private ServiceAreaConfig serviceArea;

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public ScheduleConfig getSchedule() {
        return schedule;
    }

    public void setSchedule(ScheduleConfig schedule) {
        this.schedule = schedule;
    }

    public BookingConfig getBooking() {
        return booking;
    }

    public void setBooking(BookingConfig booking) {
        this.booking = booking;
    }

    public VerificationConfig getVerification() {
        return verification;
    }

    public void setVerification(VerificationConfig verification) {
        this.verification = verification;
    }

    public ServiceAreaConfig getServiceArea() {
        return serviceArea;
    }

    public void setServiceArea(ServiceAreaConfig serviceArea) {
        this.serviceArea = serviceArea;
    }

    public static class ScheduleConfig {
        private String cycleStart;
        private String workStart;
        private String workEnd;
        private String lunchStart;
        private String lunchEnd;

        public String getCycleStart() {
            return cycleStart;
        }

        public void setCycleStart(String cycleStart) {
            this.cycleStart = cycleStart;
        }

        public String getWorkStart() {
            return workStart;
        }

        public void setWorkStart(String workStart) {
            this.workStart = workStart;
        }

        public String getWorkEnd() {
            return workEnd;
        }

        public void setWorkEnd(String workEnd) {
            this.workEnd = workEnd;
        }

        public String getLunchStart() {
            return lunchStart;
        }

        public void setLunchStart(String lunchStart) {
            this.lunchStart = lunchStart;
        }

        public String getLunchEnd() {
            return lunchEnd;
        }

        public void setLunchEnd(String lunchEnd) {
            this.lunchEnd = lunchEnd;
        }
    }

    public static class BookingConfig {
        private int slotMinutes;
        private List<Integer> allowedMinuteMarks;
        private int maxFutureMonthsAhead;
        private long pendingTtlSeconds;
        private boolean blockOtherBookingsWhenPending;
        private List<String> statuses;

        public int getSlotMinutes() {
            return slotMinutes;
        }

        public void setSlotMinutes(int slotMinutes) {
            this.slotMinutes = slotMinutes;
        }

        public List<Integer> getAllowedMinuteMarks() {
            return allowedMinuteMarks;
        }

        public void setAllowedMinuteMarks(List<Integer> allowedMinuteMarks) {
            this.allowedMinuteMarks = allowedMinuteMarks;
        }

        public int getMaxFutureMonthsAhead() {
            return maxFutureMonthsAhead;
        }

        public void setMaxFutureMonthsAhead(int maxFutureMonthsAhead) {
            this.maxFutureMonthsAhead = maxFutureMonthsAhead;
        }

        public long getPendingTtlSeconds() {
            return pendingTtlSeconds;
        }

        public void setPendingTtlSeconds(long pendingTtlSeconds) {
            this.pendingTtlSeconds = pendingTtlSeconds;
        }

        public boolean isBlockOtherBookingsWhenPending() {
            return blockOtherBookingsWhenPending;
        }

        public void setBlockOtherBookingsWhenPending(boolean blockOtherBookingsWhenPending) {
            this.blockOtherBookingsWhenPending = blockOtherBookingsWhenPending;
        }

        public List<String> getStatuses() {
            return statuses;
        }

        public void setStatuses(List<String> statuses) {
            this.statuses = statuses;
        }
    }

    public static class VerificationConfig {
        private long otpTtlSeconds;
        private long otpResendAfterSeconds;

        public long getOtpTtlSeconds() {
            return otpTtlSeconds;
        }

        public void setOtpTtlSeconds(long otpTtlSeconds) {
            this.otpTtlSeconds = otpTtlSeconds;
        }

        public long getOtpResendAfterSeconds() {
            return otpResendAfterSeconds;
        }

        public void setOtpResendAfterSeconds(long otpResendAfterSeconds) {
            this.otpResendAfterSeconds = otpResendAfterSeconds;
        }
    }

    public static class ServiceAreaConfig {
        private List<String> allowedCities;
        private List<String> allowedStates;

        public List<String> getAllowedCities() {
            return allowedCities;
        }

        public void setAllowedCities(List<String> allowedCities) {
            this.allowedCities = allowedCities;
        }

        public List<String> getAllowedStates() {
            return allowedStates;
        }

        public void setAllowedStates(List<String> allowedStates) {
            this.allowedStates = allowedStates;
        }
    }
}
