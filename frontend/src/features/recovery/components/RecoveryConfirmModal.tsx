import { useEffect } from "react";

type WindowWithOtpCredential = Window & {
  OTPCredential?: unknown;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 3);
}

function canUseWebOtp() {
  const otpWindow = window as WindowWithOtpCredential;
  return "OTPCredential" in otpWindow && "credentials" in navigator;
}

type RecoveryConfirmModalProps = {
  code: string;
  setCode: (value: string) => void;
  expiresLabel: string;
  resendAfter: number;
  onConfirm: () => void;
  onResend: () => void;
  canConfirm: boolean;
  canResend: boolean;
  isConfirming: boolean;
  isResending: boolean;
  error?: Error | null;
};

export function RecoveryConfirmModal({
  code,
  setCode,
  expiresLabel,
  resendAfter,
  onConfirm,
  onResend,
  canConfirm,
  canResend,
  isConfirming,
  isResending,
  error,
}: RecoveryConfirmModalProps) {

  useEffect(() => {
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
  }, [setCode]);

  return (
    <section className="recovery-card">
      <h2>Digite o código</h2>
      <p>O código expira em <strong>{expiresLabel}</strong>.</p>
      <label>
        <span>Código</span>
        <input value={code} onChange={(e) => setCode(onlyDigits(e.target.value))} inputMode="numeric" autoComplete="one-time-code" maxLength={3} placeholder="000" />
      </label>
      {error ? <p className="recovery-card__error">{error.message}</p> : null}
      <div className="recovery-card__actions">
        <button type="button" className="primary-action" onClick={onConfirm} disabled={!canConfirm}>
          {isConfirming ? "Confirmando..." : "Confirmar"}
        </button>
        <button type="button" className="secondary-action" onClick={onResend} disabled={!canResend}>
          {isResending ? "Reenviando..." : resendAfter > 0 ? `Reenviar em ${resendAfter}s` : "Reenviar código"}
        </button>
      </div>
    </section>
  );
}
