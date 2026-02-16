package com.example.calendar.google;

import com.example.calendar.model.Servico;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.google.api.client.util.DateTime;
import com.google.api.services.calendar.Calendar;
import com.google.api.services.calendar.model.Event;
import com.google.api.services.calendar.model.EventDateTime;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Collections;

@Component
public class GoogleCalendarClient {
    private final Calendar calendar;
    private final String calendarId;

    /**
     * Constrói o cliente Calendar usando um service-account JSON (credentials Resource).
     * @param credentialsResource resource apontando para credentials.json (application.properties)
     * @param calendarId id do calendário (ex: primary)
     */
    public GoogleCalendarClient(@Value("${google.calendar.credentials}") Resource credentialsResource,
                                @Value("${google.calendar.id}") String calendarId) throws Exception {
        GoogleCredentials creds = GoogleCredentials.fromStream(credentialsResource.getInputStream())
                .createScoped(Collections.singleton("https://www.googleapis.com/auth/calendar"));
        this.calendar = new Calendar.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                JacksonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(creds))
            .setApplicationName("servico-calendar").build();
        this.calendarId = calendarId;
    }

    /**
     * Cria um evento no Google Calendar a partir do Servico e retorna o link público do evento.
     * Lança IOException em erro de rede/API.
     */
    public String createEvent(Servico s) throws IOException {
        Event ev = new Event()
            .setSummary(s.getTitle())
            .setDescription(s.getDescription())
            .setStart(new EventDateTime().setDateTime(new DateTime(s.getStart().toEpochMilli())).setTimeZone("UTC"))
            .setEnd(new EventDateTime().setDateTime(new DateTime(s.getEnd().toEpochMilli())).setTimeZone("UTC"));
        Event created = calendar.events().insert(calendarId, ev).execute();
        return created.getHtmlLink();
    }

    /**
     * Cancela (remove) evento por eventId. Aqui assumimos que eventId == serviceId; se usar outro campo,
     * armazene eventId no model. Simples wrapper para excluir.
     */
    public void deleteEvent(String eventId) throws IOException {
        calendar.events().delete(calendarId, eventId).execute();
    }
}
