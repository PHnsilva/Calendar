package br.com.calendarmate.booking.application;

import br.com.calendarmate.dto.AvailableSlotResponse;
import br.com.calendarmate.service.ServicoService;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

/**
 * Application seam for the public available-slots flow.
 *
 * The legacy service still owns behavior while booking use cases are extracted
 * incrementally behind characterization tests.
 */
@Service
public class GetAvailableSlotsUseCase {
    private final ServicoService servicoService;

    public GetAvailableSlotsUseCase(ServicoService servicoService) {
        this.servicoService = servicoService;
    }

    public List<AvailableSlotResponse> execute(LocalDate date, String city, int slotMinutes) throws IOException {
        return servicoService.getAvailableSlots(date, city, slotMinutes);
    }
}
