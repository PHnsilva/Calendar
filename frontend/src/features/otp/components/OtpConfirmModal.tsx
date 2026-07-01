import { useEffect, useRef, type ChangeEvent, type ClipboardEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useOtpFlow } from "../hooks/useOtpFlow";
import { normalizeApiErrorMessage } from "../../../lib/errors";
import { OTP_CODE_LENGTH, applyOtpBackspace, applyOtpInput, codeToOtpDigits } from "../../../lib/otp";

type WindowWithOtpCredential = Window & {
  OTPCredential?: unknown;
};

type OtpConfirmModalProps = {
  open: boolean;
  phone: string;
  verificationId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  onClose: () => void;
  onVerified: () => void;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, OTP_CODE_LENGTH);
}

function focusOtpInput(refs: Array<HTMLInputElement | null>, index: number) {
  window.requestAnimationFrame(() => {
    const input = refs[index];
    input?.focus();
    input?.select();
  });
}

function canUseWebOtp() {
  const otpWindow = window as WindowWithOtpCredential;
  return "OTPCredential" in otpWindow && "credentials" in navigator;
}

export default function OtpConfirmModal({
  open,
  phone,
  verificationId,
  expiresInSeconds,
  resendAfterSeconds,
  onClose,
  onVerified,
}: OtpConfirmModalProps) {
  const {
    code,
    setCode,
    resendCooldown,
    expiresIn,
    expiresLabel,
    feedbackMessage,
    canConfirm,
    canResend,
    isConfirming,
    isResending,
    confirmError,
    resendError,
    submitConfirm,
    submitResend,
  } = useOtpFlow({
    verificationId,
    initialResendAfterSeconds: resendAfterSeconds,
    initialExpiresInSeconds: expiresInSeconds,
    onVerified,
  });
  const codeDigits = codeToOtpDigits(code, OTP_CODE_LENGTH);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const autoSubmitRef = useRef("");


  useEffect(() => {
    if (!open) return;
    if (!canUseWebOtp()) return;

    const controller = new AbortController();

    (async () => {
      try {
        const credentialsApi = navigator.credentials as CredentialsContainer & {
          get?: (options?: CredentialRequestOptions & {
            otp?: { transport: string[] };
            signal?: AbortSignal;
          }) => Promise<{ code?: string } | null>;
        };

        const result = await credentialsApi.get?.({
          otp: { transport: ["sms"] },
          signal: controller.signal,
        });

        const codeFromSms = onlyDigits(result?.code ?? "");
        if (codeFromSms) {
          setCode(codeFromSms);
        }
      } catch {
      }
    })();

    return () => controller.abort();
  }, [open, setCode]);

  useEffect(() => {
    if (!open) return;
    autoSubmitRef.current = "";
    focusOtpInput(codeInputRefs.current, 0);
  }, [open, verificationId]);

  useEffect(() => {
    if (!open || code.length < OTP_CODE_LENGTH) {
      autoSubmitRef.current = "";
      return;
    }
    if (!canConfirm) return;
    const attemptKey = `${verificationId}:${code}`;
    if (autoSubmitRef.current === attemptKey) return;
    autoSubmitRef.current = attemptKey;
    submitConfirm();
  }, [canConfirm, code, open, submitConfirm, verificationId]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCodeChange = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const next = applyOtpInput(codeDigits, index, event.target.value);
    setCode(next.digits.join(""));
    focusOtpInput(codeInputRefs.current, next.focusIndex);
  };

  const handleCodeKeyDown = (index: number, event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      if (!codeDigits[index] && index === 0) return;
      event.preventDefault();
      const next = applyOtpBackspace(codeDigits, index);
      setCode(next.digits.join(""));
      focusOtpInput(codeInputRefs.current, next.focusIndex);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusOtpInput(codeInputRefs.current, index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_CODE_LENGTH - 1) {
      event.preventDefault();
      focusOtpInput(codeInputRefs.current, index + 1);
    }
  };

  const handleCodePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text");
    if (!pasted) return;
    event.preventDefault();
    const next = applyOtpInput(codeDigits, index, pasted);
    setCode(next.digits.join(""));
    focusOtpInput(codeInputRefs.current, next.focusIndex);
  };

  return (
    <div className="booking-preview-modal otp-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="booking-preview-modal__backdrop"
        onClick={onClose}
        aria-label="Fechar verificação"
      />

      <div className="booking-preview-modal__card otp-modal__card">
        <div className="booking-preview-modal__header">
          <div>
            <span className="booking-preview-modal__eyebrow">Confirmar telefone</span>
            <h3 className="booking-preview-modal__title">Digite o código de 3 dígitos</h3>
          </div>

          <button
            type="button"
            className="booking-preview-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="booking-preview-modal__body otp-modal__body">
          <div className="booking-preview-modal__summary otp-modal__summary">
            <span>Telefone informado</span>
            <strong>{phone}</strong>
            <small>O código expira em {expiresLabel}.</small>
          </div>

          <div className="booking-form__field">
            <span>Código</span>
            <div className="wf-confirm-code-fields">
              {[0, 1, 2].map((index) => (
                <input
                  key={index}
                  ref={(element) => {
                    codeInputRefs.current[index] = element;
                  }}
                  value={codeDigits[index] ?? ""}
                  onChange={(event) => handleCodeChange(index, event)}
                  onKeyDown={(event) => handleCodeKeyDown(index, event)}
                  onPaste={(event) => handleCodePaste(index, event)}
                  onFocus={(event) => event.currentTarget.select()}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  placeholder="0"
                  className="booking-form__input booking-form__input--otp"
                />
              ))}
            </div>
          </div>

          {feedbackMessage ? <p className="booking-form__feedback booking-form__feedback--success">{feedbackMessage}</p> : null}
          {confirmError ? (
            <p className="booking-form__feedback booking-form__feedback--error">{normalizeApiErrorMessage(confirmError, { context: "verification" })}</p>
          ) : null}
          {resendError ? (
            <p className="booking-form__feedback booking-form__feedback--error">{normalizeApiErrorMessage(resendError, { context: "verification" })}</p>
          ) : null}
          {expiresIn <= 0 ? (
            <p className="booking-form__feedback booking-form__feedback--error">
              O código expirou. Reabra o fluxo para gerar um novo.
            </p>
          ) : null}
        </div>

        <div className="booking-preview-modal__footer otp-modal__footer">
          <button type="button" className="secondary-action" onClick={onClose}>
            Depois
          </button>

          <button
            type="button"
            className="secondary-action secondary-action--ghost"
            onClick={submitResend}
            disabled={!canResend}
            title={canResend ? "Reenviar código" : `Aguarde ${resendCooldown}s`}
          >
            {isResending ? "Reenviando..." : canResend ? "Reenviar" : `Reenviar em ${resendCooldown}s`}
          </button>

          <button
            type="button"
            className="primary-action"
            onClick={submitConfirm}
            disabled={!canConfirm}
          >
            {isConfirming ? "Confirmando..." : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
