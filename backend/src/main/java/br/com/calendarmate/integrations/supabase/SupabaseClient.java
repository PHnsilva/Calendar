package br.com.calendarmate.integrations.supabase;

import org.springframework.http.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

public class SupabaseClient {

    private final RestTemplate http;
    private final String baseUrl; // ex: https://xxxx.supabase.co
    private final String apiKey; // anon ou service key
    private final String schema; // ex: public

    public SupabaseClient(RestTemplate http, String baseUrl, String apiKey, String schema) {
        this.http = http;
        this.baseUrl = trimSlash(baseUrl);
        this.apiKey = apiKey;
        this.schema = (schema == null || schema.isBlank()) ? "public" : schema.trim();
    }

    public List<Map> select(String table, Map<String, String> filters, int limit, String order) {
        String url = baseUrl + "/rest/v1/" + table;

        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);
        if (filters != null) {
            for (var e : filters.entrySet()) {
                // filtro PostgREST: col=eq.value
                b.queryParam(e.getKey(), "eq." + e.getValue());
            }
        }
        if (limit > 0)
            b.queryParam("limit", limit);
        if (order != null && !order.isBlank())
            b.queryParam("order", order);

        HttpEntity<Void> req = new HttpEntity<>(headers(false));
        ResponseEntity<List> resp = http.exchange(b.toUriString(), HttpMethod.GET, req, List.class);

        return resp.getBody();
    }

    public void insert(String table, Object jsonBody) {
        String url = baseUrl + "/rest/v1/" + table;

        HttpEntity<Object> req = new HttpEntity<>(jsonBody, headers(true));
        http.exchange(url, HttpMethod.POST, req, String.class);
    }

    public void delete(String table, Map<String, String> filters) {
        String url = baseUrl + "/rest/v1/" + table;
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);

        if (filters != null) {
            for (var e : filters.entrySet()) {
                b.queryParam(e.getKey(), "eq." + e.getValue());
            }
        }

        HttpEntity<Void> req = new HttpEntity<>(headers(false));
        http.exchange(b.toUriString(), HttpMethod.DELETE, req, String.class);
    }

    private HttpHeaders headers(boolean returningRepresentation) {
        HttpHeaders h = new HttpHeaders();
        h.set("apikey", apiKey);
        h.set("Authorization", "Bearer " + apiKey);
        h.set("Accept", "application/json");
        h.set("Content-Type", "application/json");
        h.set("Accept-Profile", schema);
        h.set("Content-Profile", schema);
        if (returningRepresentation) {
            h.set("Prefer", "return=representation");
        }
        return h;
    }

    private static String trimSlash(String s) {
        if (s == null)
            return "";
        String x = s.trim();
        while (x.endsWith("/"))
            x = x.substring(0, x.length() - 1);
        return x;
    }

    public void update(String table, Map<String, String> filters, Object jsonBody) {
        String url = baseUrl + "/rest/v1/" + table;
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url);

        if (filters != null) {
            for (var e : filters.entrySet()) {
                b.queryParam(e.getKey(), "eq." + e.getValue());
            }
        }

        HttpEntity<Object> req = new HttpEntity<>(jsonBody, headers(false));
        http.exchange(b.toUriString(), HttpMethod.PATCH, req, String.class);
    }

    public int deleteLt(String table, String column, long value) {
        String url = baseUrl + "/rest/v1/" + table;

        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url)
                .queryParam(column, "lt." + value);

        HttpHeaders h = headers(false);
        h.set("Prefer", "return=representation");

        HttpEntity<Void> req = new HttpEntity<>(h);
        ResponseEntity<List> resp = http.exchange(b.toUriString(), HttpMethod.DELETE, req, List.class);

        List body = resp.getBody();
        return body == null ? 0 : body.size();
    }
}