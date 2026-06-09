package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.ExternalServiceException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class MisconfiguredOtpDeliveryClient implements OtpDeliveryClient {
    private static final Logger log = LoggerFactory.getLogger(MisconfiguredOtpDeliveryClient.class);

    private final String providerName;
    private final String message;
    private final String missingConfiguration;

    public MisconfiguredOtpDeliveryClient(String message) {
        this("VerificationProvider", message, "unknown");
    }

    public MisconfiguredOtpDeliveryClient(String providerName, String message, String missingConfiguration) {
        this.providerName = providerName;
        this.message = message;
        this.missingConfiguration = missingConfiguration;
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        log.warn(
                "Verification provider configuration missing provider={} missing={}",
                providerName,
                missingConfiguration == null || missingConfiguration.isBlank() ? "unknown" : missingConfiguration);
        throw ExternalServiceException.providerConfigMissing(providerName, message);
    }

    @Override
    public String getChannel() {
        return providerName == null || providerName.isBlank() ? "MISCONFIGURED" : providerName;
    }
}
