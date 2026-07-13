package br.com.calendarmate.config;

import br.com.calendarmate.integrations.banking.DummyStatementProvider;
import br.com.calendarmate.integrations.banking.StatementProvider;
import br.com.calendarmate.integrations.banking.inter.InterStatementProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyStore;

import static org.assertj.core.api.Assertions.assertThat;

class BankingConfigTest {

    @TempDir
    Path tempDir;

    @Test
    void disabledBankingSelectsDummyProvider() {
        BankingProperties properties = propertiesWith("enabled", false);
        ReflectionTestUtils.setField(properties, "provider", "INTER");

        StatementProvider provider = new BankingConfig().statementProvider(properties);

        assertThat(provider).isInstanceOf(DummyStatementProvider.class);
    }

    @Test
    void unsupportedProviderSelectsDummyProvider() {
        BankingProperties properties = propertiesWith("enabled", true);
        ReflectionTestUtils.setField(properties, "provider", "UNKNOWN");

        StatementProvider provider = new BankingConfig().statementProvider(properties);

        assertThat(provider).isInstanceOf(DummyStatementProvider.class);
    }

    @Test
    void interProviderRequiresBothFeatureFlags() {
        BankingProperties properties = propertiesWith("enabled", true);
        ReflectionTestUtils.setField(properties, "provider", "INTER");
        ReflectionTestUtils.setField(properties, "interEnabled", true);
        ReflectionTestUtils.setField(properties, "interPjFeatureEnabled", false);

        StatementProvider provider = new BankingConfig().statementProvider(properties);

        assertThat(provider).isInstanceOf(DummyStatementProvider.class);
    }

    @Test
    void completeInterSelectionBuildsInterProviderWithoutCallingIt() throws Exception {
        String password = "changeit";
        Path certificate = createPkcs12(password);
        BankingProperties properties = propertiesWith("enabled", true);
        ReflectionTestUtils.setField(properties, "provider", "INTER");
        ReflectionTestUtils.setField(properties, "interEnabled", true);
        ReflectionTestUtils.setField(properties, "interPjFeatureEnabled", true);
        ReflectionTestUtils.setField(properties, "interCertP12Path", certificate.toString());
        ReflectionTestUtils.setField(properties, "interCertP12Password", password);

        StatementProvider provider = new BankingConfig().statementProvider(properties);

        assertThat(provider).isInstanceOf(InterStatementProvider.class);
        assertThat(provider.name()).isEqualTo("INTER");
    }

    private Path createPkcs12(String password) throws Exception {
        Path path = tempDir.resolve("inter-test.p12");
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(null, password.toCharArray());
        try (OutputStream output = Files.newOutputStream(path)) {
            keyStore.store(output, password.toCharArray());
        }
        return path;
    }

    private BankingProperties propertiesWith(String field, Object value) {
        BankingProperties properties = new BankingProperties();
        ReflectionTestUtils.setField(properties, field, value);
        return properties;
    }
}
