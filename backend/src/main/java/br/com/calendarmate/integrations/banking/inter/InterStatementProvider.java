package br.com.calendarmate.integrations.banking.inter;

import br.com.calendarmate.exception.BadRequestException;
import br.com.calendarmate.integrations.banking.StatementProvider;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

public class InterStatementProvider implements StatementProvider {

    private final InterMtlsHttp http;
    private final InterOAuthClient oauth;

    private final String baseUrl;
    private final String statementPath;
    private final String fromParam;
    private final String toParam;
    private final String contaCorrente;

    public InterStatementProvider(
            InterMtlsHttp http,
            InterOAuthClient oauth,
            String baseUrl,
            String statementPath,
            String fromParam,
            String toParam,
            String contaCorrente
    ) {
        this.http = http;
        this.oauth = oauth;
        this.baseUrl = safe(baseUrl);
        this.statementPath = safe(statementPath);
        this.fromParam = safe(fromParam);
        this.toParam = safe(toParam);
        this.contaCorrente = safe(contaCorrente);
    }

    @Override
    public String name() { return "INTER"; }

    @Override
    public List<Item> statement(LocalDate from, LocalDate to) {
        LocalDate f = Objects.requireNonNull(from);
        LocalDate t = Objects.requireNonNull(to);

        Map<String, String> headers = headers();
        String url = baseUrl + statementPath + "?" + fromParam + "=" + f + "&" + toParam + "=" + t;
        Map<String, Object> resp = http.getJson(url, headers);

        List<Map<String, Object>> rows = pickList(resp);
        return rows.stream()
                .map(this::mapRow)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    @Override
    public Health health() {
        try {
            oauth.accessToken();
            return new Health(true, name(), "ok");
        } catch (Exception e) {
            return new Health(false, name(), "falha");
        }
    }

    private Map<String, String> headers() {
        String token = oauth.accessToken();
        Map<String, String> h = new LinkedHashMap<>();
        h.put("Authorization", "Bearer " + token);
        if (!contaCorrente.isBlank()) h.put("x-conta-corrente", contaCorrente);
        return h;
    }

    private Item mapRow(Map<String, Object> m) {
        String id = first(m, "id", "codigo", "identificador");
        String date = first(m, "data", "date", "dataMovimento", "dataLancamento");
        String desc = first(m, "descricao", "description", "historico");
        String amount = first(m, "valor", "amount", "valorLancamento");
        if (date.isBlank() && desc.isBlank() && amount.isBlank()) return null;
        if (id.isBlank()) id = UUID.nameUUIDFromBytes((date + ":" + desc + ":" + amount).getBytes()).toString();
        return new Item(id, date, desc, amount);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> pickList(Map<String, Object> resp) {
        Object a = resp.get("itens");
        Object b = resp.get("items");
        Object c = resp.get("data");
        Object x = (a instanceof List) ? a : (b instanceof List) ? b : (c instanceof List) ? c : null;

        if (!(x instanceof List)) throw new BadRequestException("Resposta Inter inválida");

        List<?> list = (List<?>) x;
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object o : list) {
            if (o instanceof Map) out.add((Map<String, Object>) o);
        }
        return out;
    }

    private static String first(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null) {
                String s = String.valueOf(v).trim();
                if (!s.isBlank()) return s;
            }
        }
        return "";
    }

    private static String safe(String s) { return s == null ? "" : s.trim(); }
}