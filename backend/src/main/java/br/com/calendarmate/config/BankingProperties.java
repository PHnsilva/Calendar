package br.com.calendarmate.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BankingProperties {

    @Value("${banking.enabled:false}")
    private boolean enabled;

    @Value("${banking.provider:DUMMY}")
    private String provider;

    @Value("${inter.enabled:false}")
    private boolean interEnabled;

    @Value("${inter.baseUrl:}")
    private String interBaseUrl;

    @Value("${inter.oauth.tokenPath:/oauth/v2/token}")
    private String interOAuthTokenPath;

    @Value("${inter.oauth.scope:}")
    private String interOAuthScope;

    @Value("${inter.clientId:}")
    private String interClientId;

    @Value("${inter.clientSecret:}")
    private String interClientSecret;

    @Value("${inter.certP12Path:}")
    private String interCertP12Path;

    @Value("${inter.certP12Password:}")
    private String interCertP12Password;

    @Value("${inter.contaCorrente:}")
    private String interContaCorrente;

    @Value("${inter.banking.statementPath:/banking/v2/extrato}")
    private String interStatementPath;

    @Value("${inter.banking.fromParam:dataInicio}")
    private String interFromParam;

    @Value("${inter.banking.toParam:dataFim}")
    private String interToParam;

    public boolean isEnabled() { return enabled; }

    public String getProvider() {
        return (provider == null || provider.isBlank()) ? "DUMMY" : provider.trim().toUpperCase();
    }

    public boolean isInterEnabled() { return interEnabled; }
    public String getInterBaseUrl() { return safe(interBaseUrl); }
    public String getInterOAuthTokenPath() { return safe(interOAuthTokenPath); }
    public String getInterOAuthScope() { return safe(interOAuthScope); }
    public String getInterClientId() { return safe(interClientId); }
    public String getInterClientSecret() { return safe(interClientSecret); }
    public String getInterCertP12Path() { return safe(interCertP12Path); }
    public String getInterCertP12Password() { return interCertP12Password == null ? "" : interCertP12Password; }
    public String getInterContaCorrente() { return safe(interContaCorrente); }
    public String getInterStatementPath() { return safe(interStatementPath); }
    public String getInterFromParam() { return safe(interFromParam); }
    public String getInterToParam() { return safe(interToParam); }

    private static String safe(String s) { return s == null ? "" : s.trim(); }
}