package br.com.calendarmate.service;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.PublicBootstrapResponse;
import org.springframework.stereotype.Service;

@Service
public class PublicConfigService {

    private final AppProperties props;

    public PublicConfigService(AppProperties props) {
        this.props = props;
    }

    public PublicBootstrapResponse bootstrap() {
        PublicBootstrapResponse out = new PublicBootstrapResponse();
        out.setTimezone(props.getZone());
        out.setSchedule(buildSchedule());
        out.setBooking(buildBooking());
        out.setVerification(buildVerification());
        out.setServiceArea(buildServiceArea());
        return out;
    }

    private PublicBootstrapResponse.ScheduleConfig buildSchedule() {
        PublicBootstrapResponse.ScheduleConfig schedule = new PublicBootstrapResponse.ScheduleConfig();
        schedule.setCycleStart(props.getScheduleCycleStart() == null ? null : props.getScheduleCycleStart().toString());
        schedule.setWorkStart(props.getWorkStart().toString());
        schedule.setWorkEnd(props.getWorkEnd().toString());
        schedule.setLunchStart(props.getLunchStart().toString());
        schedule.setLunchEnd(props.getLunchEnd().toString());
        return schedule;
    }

    private PublicBootstrapResponse.BookingConfig buildBooking() {
        PublicBootstrapResponse.BookingConfig booking = new PublicBootstrapResponse.BookingConfig();
        booking.setSlotMinutes(props.getBookingSlotMinutes());
        booking.setAllowedMinuteMarks(props.getAllowedMinuteMarksList());
        booking.setMaxFutureMonthsAhead(props.getBookingMaxFutureMonthsAhead());
        booking.setPendingTtlSeconds(props.getPendingTtl().toSeconds());
        booking.setBlockOtherBookingsWhenPending(props.isBlockOtherBookingsWhenPending());
        booking.setStatuses(props.getBookingStatuses());
        return booking;
    }

    private PublicBootstrapResponse.VerificationConfig buildVerification() {
        PublicBootstrapResponse.VerificationConfig verification = new PublicBootstrapResponse.VerificationConfig();
        verification.setOtpTtlSeconds(props.getOtpTtl().toSeconds());
        verification.setOtpResendAfterSeconds(props.getOtpResendAfter().toSeconds());
        return verification;
    }

    private PublicBootstrapResponse.ServiceAreaConfig buildServiceArea() {
        PublicBootstrapResponse.ServiceAreaConfig serviceArea = new PublicBootstrapResponse.ServiceAreaConfig();
        serviceArea.setAllowedCities(props.getAllowedCitiesDisplay());
        serviceArea.setAllowedStates(props.getAllowedStatesDisplay());
        return serviceArea;
    }
}
