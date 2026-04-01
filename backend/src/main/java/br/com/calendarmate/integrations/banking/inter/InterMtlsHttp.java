package br.com.calendarmate.integrations.banking.inter;

import br.com.calendarmate.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;

import javax.net.ssl.*;
import java.io.FileInputStream;
import java.net.URI;
import java.net.http.*;
import java.security.KeyStore;
import java.time.Duration;
import java.util.Map;

public class InterMtlsHttp {

    private final HttpClient client;
    private final ObjectMapper om = new ObjectMapper();

    public InterMtlsHttp(String p12Path, String p12Password) {
        this.client = HttpClient.newBuilder()
                .sslContext(ssl(p12Path, p12Password))
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public Map<String, Object> postForm(String url, String body, Map<String, String> headers) {
        return send(url, "POST", body, "application/x-www-form-urlencoded", headers);
    }

    public Map<String, Object> getJson(String url, Map<String, String> headers) {
        return send(url, "GET", null, null, headers);
    }

    private Map<String, Object> send(String url, String method, String body, String contentType, Map<String, String> headers) {
        try {
            HttpRequest.Builder b = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(30))
                    .header("Accept", "application/json");

            if (headers != null) headers.forEach(b::header);
            if (contentType != null) b.header("Content-Type", contentType);

            if ("POST".equalsIgnoreCase(method)) {
                b.POST(HttpRequest.BodyPublishers.ofString(body == null ? "" : body));
            } else {
                b.method(method, HttpRequest.BodyPublishers.noBody());
            }

            HttpResponse<String> resp = client.send(b.build(), HttpResponse.BodyHandlers.ofString());
            if (resp.statusCode() / 100 != 2) throw new BadRequestException("Inter HTTP " + resp.statusCode());
            return om.readValue(resp.body(), Map.class);
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new BadRequestException("Falha Inter HTTP");
        }
    }

    private static SSLContext ssl(String p12Path, String p12Password) {
        if (p12Path == null || p12Path.isBlank()) throw new BadRequestException("INTER_CERT_P12_PATH não configurado");
        try (FileInputStream fis = new FileInputStream(p12Path)) {
            char[] pass = (p12Password == null) ? new char[0] : p12Password.toCharArray();
            KeyStore ks = KeyStore.getInstance("PKCS12");
            ks.load(fis, pass);

            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, pass);

            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init((KeyStore) null);

            SSLContext sc = SSLContext.getInstance("TLS");
            sc.init(kmf.getKeyManagers(), tmf.getTrustManagers(), new java.security.SecureRandom());
            return sc;
        } catch (Exception e) {
            throw new BadRequestException("Certificado Inter inválido");
        }
    }
}