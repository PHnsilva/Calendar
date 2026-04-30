package br.com.calendarmate.integrations;

import br.com.calendarmate.exception.BadRequestException;

public class MisconfiguredOtpDeliveryClient implements OtpDeliveryClient {

    private final String message;

    public MisconfiguredOtpDeliveryClient(String message) {
        this.message = message;
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        throw new BadRequestException(message);
    }

    @Override
    public String getChannel() {
        return "MISCONFIGURED";
    }
}
