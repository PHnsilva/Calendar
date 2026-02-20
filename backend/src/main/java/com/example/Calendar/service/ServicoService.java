package com.example.Calendar.service;

import com.example.Calendar.dto.ServicoCreateResponse;
import com.example.Calendar.dto.ServicoRequest;
import com.example.Calendar.dto.ServicoResponse;
import com.example.Calendar.exception.BadRequestException;
import com.example.Calendar.exception.ConflictException;
import com.example.Calendar.exception.ForbiddenException;
import com.example.Calendar.exception.NotFoundException;
import com.example.Calendar.google.CalendarClient;
import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

public class ServicoService {

    private final CalendarClient calendar;
    private final TokenUtil tokenUtil;
    private final ScheduleRules rules = new ScheduleRules(LocalDate.parse(
            System.getenv().getOrDefault("CYCLE_START", "2026-02-01")));

    // regras simples (ajuste quando quiser)
    private static final ZoneId ZONE = ZoneId.of("America/Sao_Paulo");
    private static final int DEFAULT_DURATION_MINUTES = 60;
    private static final Set<Integer> ALLOWED_MINUTES = Set.of(0, 30); // validação de minutos (00 ou 30)

    public ServicoService(CalendarClient calendar, TokenUtil tokenUtil) {
        this.calendar = calendar;
        this.tokenUtil = tokenUtil;
    }

    private void validateDateWindow(LocalDate requestedDate) {
        LocalDate today = LocalDate.now(ZONE);

        if (requestedDate == null) {
            throw new BadRequestException("date é obrigatório");
        }
        if (requestedDate.isBefore(today)) {
            throw new BadRequestException("Data inválida: não pode ser no passado");
        }

        YearMonth ymReq = YearMonth.from(requestedDate);
        YearMonth ymNow = YearMonth.from(today);
        YearMonth ymNext = ymNow.plusMonths(1);

        if (!ymReq.equals(ymNow) && !ymReq.equals(ymNext)) {
            throw new BadRequestException("Data inválida: apenas mês atual ou próximo");
        }
    }

    public ServicoCreateResponse create(ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        validateTime(req.getTime());
        if (rules.isOffDay(req.getDate())) {
            throw new BadRequestException("Dia indisponível (folga do proprietário).");
        }

        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), ZONE);
        ZonedDateTime endZ = startZ.plusMinutes(DEFAULT_DURATION_MINUTES);

        Instant start = startZ.toInstant();
        Instant end = endZ.toInstant();
        if (!end.isAfter(start))
            throw new BadRequestException("Horário inválido");

        // checar disponibilidade via freeBusy
        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy != null && !busy.isEmpty()) {
            throw new ConflictException("Horário indisponível");
        }

        // montar Servico (apenas para enviar ao CalendarClient)
        Servico s = new Servico();
        s.setId(UUID.randomUUID().toString());
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(start);
        s.setEnd(end);
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(req.getClientPhone());
        s.setClientAddress(req.getClientAddress());
        s.setStatus("AGENDADO");

        Event created = calendar.createEvent(s);

        String token = tokenUtil.generate(created.getId(), req.getClientEmail());

        // preencher o ServicoResponse (é aqui que ficam eventId/eventLink/etc)
        ServicoResponse servico = new ServicoResponse();
        servico.setEventId(created.getId());
        servico.setEventLink(created.getHtmlLink());
        servico.setServiceType(req.getServiceType());
        servico.setStart(start);
        servico.setEnd(end);
        servico.setClientFirstName(req.getClientFirstName());
        servico.setClientLastName(req.getClientLastName());
        servico.setClientEmail(req.getClientEmail());
        servico.setClientPhone(req.getClientPhone());
        servico.setClientAddress(req.getClientAddress());
        servico.setStatus("AGENDADO");

        // wrapper de criação: servico + manageToken
        ServicoCreateResponse out = new ServicoCreateResponse();
        out.setServico(servico);
        out.setManageToken(token);

        return out;
    }

    public ServicoResponse getByToken(String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null) {
            throw new ForbiddenException("Token inválido ou expirado");
        }

        Event e = calendar.getEvent(vt.getEventId());

        // IMPORTANTe: se foi deletado e virou "cancelled", vamos tratar como não
        // encontrado
        if (e == null || "cancelled".equalsIgnoreCase(e.getStatus())) {
            throw new NotFoundException("Agendamento não encontrado");
        }

        // (extra segurança) confirmar que o email do token bate com o email salvo no
        // evento
        Map<String, String> ext = privateExt(e);
        String email = ext.getOrDefault("clientEmail", "");

        if (email.isBlank() || !vt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("Token inválido");
        }

        return mapEventToResponse(e);
    }

    public List<ServicoResponse> listMy(String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null)
            throw new ForbiddenException("Token inválido ou expirado");

        ZonedDateTime from = ZonedDateTime.now(ZONE).withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);
        ZonedDateTime to = from.plusMonths(2);

        List<Event> events = calendar.listEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));

        if (events == null)
            return Collections.emptyList();

        String myEmail = vt.getClientEmail().toLowerCase(Locale.ROOT);

        return events.stream()
                .filter(e -> myEmail.equals(privateExt(e).getOrDefault("clientEmail", "").toLowerCase(Locale.ROOT)))
                .map(this::mapEventToResponse)
                .collect(Collectors.toList());
    }

    public ServicoResponse updateByToken(String eventId, String token, ServicoRequest req) throws IOException {
        validateDateWindow(req.getDate());
        validateTime(req.getTime());
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId))
            throw new ForbiddenException("Token inválido");

        Event existing = calendar.getEvent(eventId);
        if (existing == null)
            throw new NotFoundException("Agendamento não encontrado");

        // confirmar email
        String existingEmail = privateExt(existing).getOrDefault("clientEmail", "");
        if (!vt.getClientEmail().equalsIgnoreCase(existingEmail)) {
            throw new ForbiddenException("Token inválido");
        }

        validateTime(req.getTime());

        ZonedDateTime startZ = ZonedDateTime.of(req.getDate(), req.getTime(), ZONE);
        ZonedDateTime endZ = startZ.plusMinutes(DEFAULT_DURATION_MINUTES);

        Instant start = startZ.toInstant();
        Instant end = endZ.toInstant();
        if (!end.isAfter(start))
            throw new BadRequestException("Horário inválido");

        // checar conflito permitindo o próprio evento
        DateTime timeMin = new DateTime(Date.from(start));
        DateTime timeMax = new DateTime(Date.from(end));
        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null)
            busy = Collections.emptyList();

        Instant oldStart = instantFrom(existing.getStart());
        Instant oldEnd = instantFrom(existing.getEnd());

        boolean conflict = busy.stream().anyMatch(tp -> {
            if (tp.getStart() == null || tp.getEnd() == null)
                return true;
            Instant bs = Instant.ofEpochMilli(tp.getStart().getValue());
            Instant be = Instant.ofEpochMilli(tp.getEnd().getValue());
            boolean isSelf = bs.equals(oldStart) && be.equals(oldEnd);
            return !isSelf;
        });

        if (conflict)
            throw new ConflictException("Horário indisponível");

        Servico s = new Servico();
        s.setEventId(eventId);
        s.setTitle(req.getServiceType());
        s.setDescription(req.getServiceType());
        s.setStart(start);
        s.setEnd(end);
        s.setClientFirstName(req.getClientFirstName());
        s.setClientLastName(req.getClientLastName());
        s.setClientEmail(req.getClientEmail());
        s.setClientPhone(req.getClientPhone());
        s.setClientAddress(req.getClientAddress());
        s.setStatus("AGENDADO");

        Event updated = calendar.updateEvent(s);
        return mapEventToResponse(updated);
    }

    public void cancelByToken(String eventId, String token) throws IOException {
        TokenUtil.VerifiedToken vt = tokenUtil.verify(token);
        if (vt == null || !vt.getEventId().equals(eventId))
            throw new ForbiddenException("Token inválido");

        Event e = calendar.getEvent(eventId);
        if (e == null)
            throw new NotFoundException("Agendamento não encontrado");

        String email = privateExt(e).getOrDefault("clientEmail", "");
        if (!vt.getClientEmail().equalsIgnoreCase(email)) {
            throw new ForbiddenException("Token inválido");
        }

        calendar.deleteEvent(eventId);
    }

    public List<ServicoResponse> listAllAdmin() throws IOException {
        ZonedDateTime from = ZonedDateTime.now(ZONE).withDayOfMonth(1).toLocalDate().atStartOfDay(ZONE);
        ZonedDateTime to = from.plusMonths(2);

        List<Event> events = calendar.listEvents(
                new DateTime(Date.from(from.toInstant())),
                new DateTime(Date.from(to.toInstant())));

        if (events == null)
            return Collections.emptyList();
        return events.stream().map(this::mapEventToResponse).collect(Collectors.toList());
    }

    public void deleteByIdAdmin(String eventId) throws IOException {
        Event e = calendar.getEvent(eventId);
        if (e == null)
            throw new NotFoundException("Agendamento não encontrado");

        try {
            calendar.deleteEvent(eventId);
        } catch (IllegalArgumentException ex) {
            // evento existe mas não é do sistema
            throw new ForbiddenException(ex.getMessage());
        }
    }

    public List<String> getAvailableSlots(LocalDate date, int slotMinutes) throws IOException {
        validateDateWindow(date);
        if (slotMinutes <= 0)
            throw new BadRequestException("slotMinutes deve ser > 0");
        if (rules.isOffDay(date))
            return List.of();

        LocalTime WORK_START = LocalTime.of(8, 0);
        LocalTime WORK_END = LocalTime.of(18, 0);
        LocalTime LUNCH_START = LocalTime.of(12, 0);
        LocalTime LUNCH_END = LocalTime.of(13, 0);

        ZonedDateTime dayStart = ZonedDateTime.of(date, WORK_START, ZONE);
        ZonedDateTime dayEnd = ZonedDateTime.of(date, WORK_END, ZONE);

        DateTime timeMin = new DateTime(Date.from(dayStart.toInstant()));
        DateTime timeMax = new DateTime(Date.from(dayEnd.toInstant()));

        List<TimePeriod> busy = calendar.freeBusy(timeMin, timeMax);
        if (busy == null)
            busy = Collections.emptyList();

        List<ZonedDateTime> slots = new ArrayList<>();
        ZonedDateTime current = dayStart;

        while (!current.plusMinutes(slotMinutes).isAfter(dayEnd)) {
            LocalTime t = current.toLocalTime();

            boolean inLunch = !t.isBefore(LUNCH_START) && t.isBefore(LUNCH_END);
            if (!inLunch) {
                Instant slotStart = current.toInstant();
                Instant slotEnd = current.plusMinutes(slotMinutes).toInstant();

                boolean conflict = false;
                for (TimePeriod tp : busy) {
                    if (tp.getStart() == null || tp.getEnd() == null)
                        continue;
                    Instant busyStart = Instant.ofEpochMilli(tp.getStart().getValue());
                    Instant busyEnd = Instant.ofEpochMilli(tp.getEnd().getValue());
                    if (!(slotEnd.compareTo(busyStart) <= 0 || slotStart.compareTo(busyEnd) >= 0)) {
                        conflict = true;
                        break;
                    }
                }
                if (!conflict)
                    slots.add(current);
            }
            current = current.plusMinutes(slotMinutes);
        }

        return slots.stream().map(z -> z.toOffsetDateTime().toString()).collect(Collectors.toList());
    }

    // ---------------- helpers ----------------

    private void validateTime(LocalTime time) {
        if (time == null)
            throw new BadRequestException("time é obrigatório");
        if (!ALLOWED_MINUTES.contains(time.getMinute())) {
            throw new BadRequestException("Minutos inválidos. Use 00 ou 30.");
        }
    }

    private Map<String, String> privateExt(Event e) {
        if (e.getExtendedProperties() == null)
            return Collections.emptyMap();
        if (e.getExtendedProperties().getPrivate() == null)
            return Collections.emptyMap();
        return e.getExtendedProperties().getPrivate();
    }

    private Instant instantFrom(EventDateTime edt) {
        if (edt == null)
            return null;
        DateTime dt = edt.getDateTime();
        if (dt == null)
            dt = edt.getDate();
        if (dt == null)
            return null;
        return Instant.ofEpochMilli(dt.getValue());
    }

    private ServicoResponse mapEventToResponse(Event e) {
        ServicoResponse s = new ServicoResponse();
        s.setEventId(e.getId());
        s.setEventLink(e.getHtmlLink());

        // Summary = serviceType
        s.setServiceType(e.getSummary() == null ? "" : e.getSummary());
        s.setStart(instantFrom(e.getStart()));
        s.setEnd(instantFrom(e.getEnd()));

        Map<String, String> ext = privateExt(e);
        s.setClientFirstName(ext.getOrDefault("clientFirstName", ""));
        s.setClientLastName(ext.getOrDefault("clientLastName", ""));
        s.setClientEmail(ext.getOrDefault("clientEmail", ""));
        s.setClientPhone(ext.getOrDefault("clientPhone", ""));
        s.setClientAddress(ext.getOrDefault("clientAddress", ""));

        s.setStatus("AGENDADO");
        return s;
    }
}
