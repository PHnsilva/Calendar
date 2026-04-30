package br.com.calendarmate.integrations;

import com.notificationapi.NotificationApi;
import com.notificationapi.model.NotificationRequest;
import com.notificationapi.model.SmsOptions;
import com.notificationapi.model.User;

public class NotificationApiSmsClient implements OtpDeliveryClient {

    private final NotificationApi api;
    private final String notificationType;
    private final MonthlySmsQuota quota;

    public NotificationApiSmsClient(
            String clientId,
            String clientSecret,
            String notificationType,
            MonthlySmsQuota quota) {
        this.api = new NotificationApi(clientId, clientSecret);
        this.notificationType = notificationType;
        this.quota = quota;
    }

    @Override
    public void sendCode(String phoneDigits, String code) {
        quota.acquire();
        try {
            api.send(buildRequest(phoneDigits, code));
        } catch (RuntimeException ex) {
            quota.rollback();
            throw ex;
        }
    }

    @Override
    public String getChannel() {
        return "SMS";
    }

    private NotificationRequest buildRequest(String phoneDigits, String code) {
        User user = new User(userId(phoneDigits)).setNumber(toE164(phoneDigits));
        return new NotificationRequest(notificationType, user)
                .setSms(new SmsOptions().setMessage(message(code)));
    }

    private String message(String code) {
        return "Seu código CalendarMate é: " + code;
    }

    private String userId(String phoneDigits) {
        return "otp-" + digitsOnly(phoneDigits);
    }

    private String toE164(String phoneDigits) {
        if (phoneDigits != null && phoneDigits.trim().startsWith("+")) {
            return phoneDigits.trim();
        }
        String digits = digitsOnly(phoneDigits);
        if ((digits.length() == 10 || digits.length() == 11)) {
            return "+55" + digits;
        }
        return digits.startsWith("55") ? "+" + digits : "+" + digits;
    }

    private String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D+", "");
    }
}
