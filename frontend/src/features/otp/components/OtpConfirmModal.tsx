import { useEffect } from "react";
import { useOtpFlow } from "../hooks/useOtpFlow";

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
  return value.replace(/\D/g, "").slice(0, 3);
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

          <label className="booking-form__field">
            <span>Código</span>
            <input
              value={code}
              onChange={(event) => setCode(onlyDigits(event.target.value))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123"
              className="booking-form__input booking-form__input--otp"
            />
          </label>

          {feedbackMessage ? <p className="booking-form__feedback booking-form__feedback--success">{feedbackMessage}</p> : null}
          {confirmError instanceof Error ? (
            <p className="booking-form__feedback booking-form__feedback--error">{confirmError.message}</p>
          ) : null}
          {resendError instanceof Error ? (
            <p className="booking-form__feedback booking-form__feedback--error">{resendError.message}</p>
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
