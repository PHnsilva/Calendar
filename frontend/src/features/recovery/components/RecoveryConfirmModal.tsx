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
  return (
    <section className="recovery-card">
      <h2>Digite o código</h2>
      <p>O código expira em <strong>{expiresLabel}</strong>.</p>
      <label>
        <span>Código</span>
        <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={3} placeholder="000" />
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
