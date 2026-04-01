package br.com.calendarmate.service.store;

public interface VerificationStore {

    Session create(String scopeId, String phoneDigits, long otpTtlSeconds, long resendAfterSeconds);

    Session get(String verificationId);

    void delete(String verificationId);

    Session refreshResend(String verificationId, long resendAfterSeconds);

    default void cleanupExpired() {}

    class Session {
        public final String verificationId;
        public final String scopeId;
        public final String phoneDigits;
        public final String code;
        public final long expiresAtEpochSec;
        public final long resendAllowedAtEpochSec;

        public Session(String verificationId, String scopeId, String phoneDigits, String code, long exp, long resendAt) {
            this.verificationId = verificationId;
            this.scopeId = scopeId;
            this.phoneDigits = phoneDigits;
            this.code = code;
            this.expiresAtEpochSec = exp;
            this.resendAllowedAtEpochSec = resendAt;
        }

        public Session withResendAllowedAt(long resendAtEpochSec) {
            return new Session(
                    verificationId,
                    scopeId,
                    phoneDigits,
                    code,
                    expiresAtEpochSec,
                    resendAtEpochSec
            );
        }

        public boolean isExpired() {
            return java.time.Instant.now().getEpochSecond() > expiresAtEpochSec;
        }

        public boolean canResend() {
            return java.time.Instant.now().getEpochSecond() >= resendAllowedAtEpochSec;
        }
    }
}