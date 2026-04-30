package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.ConflictException;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.util.Properties;

public class MonthlySmsQuota {

    private final int limit;
    private final Path usageFile;

    public MonthlySmsQuota(int limit, String usageFile) {
        this.limit = Math.max(0, limit);
        this.usageFile = Path.of(cleanPath(usageFile));
    }

    public synchronized void acquire() {
        Usage usage = loadCurrentUsage();
        if (usage.count() >= limit) {
            throw new ConflictException("Limite mensal de SMS atingido. Novos envios foram bloqueados para evitar custos.");
        }
        save(new Usage(currentMonth(), usage.count() + 1));
    }

    public synchronized void rollback() {
        Usage usage = loadCurrentUsage();
        save(new Usage(currentMonth(), Math.max(0, usage.count() - 1)));
    }

    private Usage loadCurrentUsage() {
        Properties props = readProperties();
        String month = props.getProperty("month", currentMonth());
        int count = parseCount(props.getProperty("count", "0"));
        return currentMonth().equals(month) ? new Usage(month, count) : new Usage(currentMonth(), 0);
    }

    private Properties readProperties() {
        Properties props = new Properties();
        if (!Files.exists(usageFile)) {
            return props;
        }
        try (InputStream in = Files.newInputStream(usageFile)) {
            props.load(in);
            return props;
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível ler o controle mensal de SMS.", ex);
        }
    }

    private void save(Usage usage) {
        try {
            createParentDirectory();
            Properties props = new Properties();
            props.setProperty("month", usage.month());
            props.setProperty("count", String.valueOf(usage.count()));
            try (OutputStream out = Files.newOutputStream(usageFile)) {
                props.store(out, "CalendarMate monthly SMS usage");
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Não foi possível salvar o controle mensal de SMS.", ex);
        }
    }

    private void createParentDirectory() throws IOException {
        Path parent = usageFile.getParent();
        if (parent != null) {
            Files.createDirectories(parent);
        }
    }

    private int parseCount(String value) {
        try {
            return Math.max(0, Integer.parseInt(value));
        } catch (NumberFormatException ex) {
            return 0;
        }
    }

    private String currentMonth() {
        return YearMonth.now().toString();
    }

    private String cleanPath(String value) {
        if (value == null || value.isBlank()) {
            return "/tmp/calendarmate-sms-usage.properties";
        }
        return value.trim();
    }

    private record Usage(String month, int count) { }
}
