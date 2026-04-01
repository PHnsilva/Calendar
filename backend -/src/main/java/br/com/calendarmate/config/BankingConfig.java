package br.com.calendarmate.config;

import br.com.calendarmate.integrations.banking.StatementProvider;
import br.com.calendarmate.integrations.banking.DummyStatementProvider;
import br.com.calendarmate.integrations.banking.inter.InterMtlsHttp;
import br.com.calendarmate.integrations.banking.inter.InterOAuthClient;
import br.com.calendarmate.integrations.banking.inter.InterStatementProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class BankingConfig {

    @Bean
    public StatementProvider statementProvider(BankingProperties p) {
        if (!p.isEnabled()) return new DummyStatementProvider();

        if ("INTER".equals(p.getProvider())) {
            if (!p.isInterEnabled()) return new DummyStatementProvider();

            InterMtlsHttp http = new InterMtlsHttp(p.getInterCertP12Path(), p.getInterCertP12Password());
            InterOAuthClient oauth = new InterOAuthClient(
                    http,
                    p.getInterBaseUrl(),
                    p.getInterOAuthTokenPath(),
                    p.getInterClientId(),
                    p.getInterClientSecret(),
                    p.getInterOAuthScope(),
                    p.getInterContaCorrente()
            );

            return new InterStatementProvider(
                    http,
                    oauth,
                    p.getInterBaseUrl(),
                    p.getInterStatementPath(),
                    p.getInterFromParam(),
                    p.getInterToParam(),
                    p.getInterContaCorrente()
            );
        }

        return new DummyStatementProvider();
    }
}