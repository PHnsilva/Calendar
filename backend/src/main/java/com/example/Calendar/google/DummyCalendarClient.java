package com.example.Calendar.google;

import com.example.Calendar.model.Servico;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.TimePeriod;

import java.io.IOException;
import java.util.*;

/**
 * Implementação leve que permite subir o contexto do Spring sem credenciais Google.
 * Nunca use em produção — é apenas para testes / fallbacks locais.
 */
public class DummyCalendarClient implements CalendarClient {

    @Override
    public Event createEvent(Servico s) throws IOException {
        Event ev = new Event();
        String id = "dummy-" + UUID.randomUUID();
        ev.setId(id);
        ev.setSummary(s.getTitle());
        ev.setDescription(s.getDescription());
        ev.setHtmlLink("http://localhost/dummy/event/" + id);
        return ev;
    }

    /**
     * Deleta um evento.
     *
     * <p>Este método não faz nada, pois é uma implementação dummy.</p>
     *
     * @param eventId o ID do evento a ser deletado
     * @throws IOException se houver um erro ao deletar o evento
     */
    @Override
    public void deleteEvent(String eventId) throws IOException {
        // noop, é dummy
    }

    /**
     * Atualiza um evento com base em um Servico.
     *
     * @param s o Servico a ser atualizado
     * @return o evento atualizado
     * @throws IOException se houver um erro ao atualizar o evento
     */
    @Override
    public Event updateEvent(Servico s) throws IOException {
        Event ev = new Event();
        ev.setId(s.getEventId());
        ev.setSummary(s.getTitle());
        ev.setDescription(s.getDescription());
        return ev;
    }

    @Override
    public Event getEvent(String eventId) throws IOException {
        return null;
    }

    @Override
    public List<Event> listEvents(DateTime timeMin, DateTime timeMax) throws IOException {
        return Collections.emptyList();
    }

    @Override
    public List<TimePeriod> freeBusy(DateTime timeMin, DateTime timeMax) throws IOException {
        return Collections.emptyList();
    }
}
