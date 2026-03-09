package com.example.Calendar.integrations.banking.inter;

import com.example.Calendar.exception.BadRequestException;

import java.time.Instant;
import java.util.Map;

public class InterOAuthClient {

    private final InterMtlsHttp http;
    private final String baseUrl;
    private final String tokenPath;
    private final String clientId;
    private final String clientSecret;
    private final String scope;
    private final String contaCorrente;

    private String token;
    private long exp;

    public InterOAuthClient(
            InterMtlsHttp http,
            String baseUrl,
            String tokenPath,
            String clientId,
            String clientSecret,
            String scope,
            String contaCorrente
    ) {
        this.http = http;
        this.baseUrl = baseUrl;
        this.tokenPath = tokenPath;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.scope = scope;
        this.contaCorrente = contaCorrente;
    }

    public synchronized String accessToken() {
        long now = Instant.now().getEpochSecond();
        if (token != null && now < (exp - 30)) return token;

        if (blank(clientId) || blank(clientSecret)) throw new BadRequestException("Inter OAuth não configurado");

        String body = form(
                "grant_type", "client_credentials",
                "client_id", clientId,
                "client_secret", clientSecret,
                "scope", scope
        );

        Map<String, Object> resp = http.postForm(baseUrl + tokenPath, body, null);

        String t = str(resp.get("access_token"));
        if (t.isBlank()) throw new BadRequestException("Inter sem access_token");

        long expiresIn = longVal(resp.get("expires_in"), 600);
        token = t;
        exp = now + expiresIn;
        return token;
    }

    public String contaCorrente() { return contaCorrente == null ? "" : contaCorrente.trim(); }

    private static boolean blank(String s) { return s == null || s.trim().isEmpty(); }
    private static String str(Object o) { return o == null ? "" : String.valueOf(o).trim(); }

    private static long longVal(Object o, long def) {
        try { return Long.parseLong(String.valueOf(o)); } catch (Exception e) { return def; }
    }

    private static String form(String... kv) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i + 1 < kv.length; i += 2) {
            String k = kv[i];
            String v = kv[i + 1];
            if (k.equals("scope") && (v == null || v.isBlank())) continue;
            if (sb.length() > 0) sb.append("&");
            sb.append(k).append("=").append(enc(v));
        }
        return sb.toString();
    }

    private static String enc(String s) {
        try { return java.net.URLEncoder.encode(s == null ? "" : s, "UTF-8"); }
        catch (Exception e) { return ""; }
    }
}