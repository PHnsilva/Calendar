package br.com.calendarmate.controller;

import br.com.calendarmate.config.AppProperties;
import br.com.calendarmate.dto.PublicBootstrapResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/public")
public class PublicBootstrapController {

    private final AppProperties props;

    public PublicBootstrapController(AppProperties props) {
        this.props = props;
    }

    @GetMapping("/bootstrap")
    public PublicBootstrapResponse bootstrap() {
        PublicBootstrapResponse response = new PublicBootstrapResponse();
        response.setTimezone(props.getZone());

        PublicBootstrapResponse.ScheduleConfig schedule = new PublicBootstrapResponse.ScheduleConfig();
        schedule.setCycleStart(props.getScheduleCycleStart() == null ? null : props.getScheduleCycleStart().toString());
        schedule.setWorkStart(props.getWorkStart().toString());
        schedule.setWorkEnd(props.getWorkEnd().toString());
        schedule.setLunchStart(props.getLunchStart().toString());
        schedule.setLunchEnd(props.getLunchEnd().toString());
        response.setSchedule(schedule);

        PublicBootstrapResponse.BookingConfig booking = new PublicBootstrapResponse.BookingConfig();
        booking.setSlotMinutes(props.getBookingSlotMinutes());
        booking.setAllowedMinuteMarks(props.getAllowedMinuteMarks());
        booking.setMaxFutureMonthsAhead(props.getMaxFutureMonthsAhead());
        booking.setPendingTtlSeconds(props.getPendingTtl().getSeconds());
        booking.setBlockOtherBookingsWhenPending(props.isBlockOtherBookingsWhenPending());
        booking.setStatuses(List.of("PENDING_PHONE", "CONFIRMED", "CANCELLED"));
        response.setBooking(booking);

        PublicBootstrapResponse.VerificationConfig verification = new PublicBootstrapResponse.VerificationConfig();
        verification.setOtpTtlSeconds(props.getOtpTtl().getSeconds());
        verification.setOtpResendAfterSeconds(props.getOtpResendAfter().getSeconds());
        response.setVerification(verification);

        PublicBootstrapResponse.ServiceAreaConfig serviceArea = new PublicBootstrapResponse.ServiceAreaConfig();
        serviceArea.setAllowedCities(props.getAllowedCitiesDisplay());
        serviceArea.setAllowedStates(props.getAllowedStatesDisplay());
        serviceArea.setDurationByCity(props.getBookingDurationByCityDisplay());
        response.setServiceArea(serviceArea);

        return response;
    }
}
