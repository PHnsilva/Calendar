type RecoveryConfirmModalProps = {
  code: string;
  expiresLabel: string;
  resendCooldown: number;
  onCodeChange: (value: string) => void;
  onConfirm: () => void;
  onResend: () => void;
  canConfirm: boolean;
  canResend: boolean;
  isConfirming: boolean;
  isResending: boolean;
};

export function RecoveryConfirmModal({
  code,
  expiresLabel,
  resendCooldown,
  onCodeChange,
  onConfirm,
  onResend,
  canConfirm,
  canResend,
  isConfirming,
  isResending,
}: RecoveryConfirmModalProps) {
  return (
    <section style={{ display: "grid", gap: 12, border: "1px solid rgba(15,23,42,.12)", borderRadius: 20, padding: 18, background: "white" }}>
      <h2 style={{ margin: 0 }}>Confirmar recuperação</h2>
      <p style={{ margin: 0, opacity: 0.8 }}>Digite o código de 3 dígitos. Ele expira em {expiresLabel}.</p>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Código</span>
        <input
          className="booking-form__input"
          value={code}
          onChange={(event) => onCodeChange(event.target.value.replace(/\D/g, "").slice(0, 3))}
          placeholder="123"
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button type="button" className="secondary-action" disabled={!canResend} onClick={onResend}>
          {isResending ? "Reenviando..." : canResend ? "Reenviar código" : `Reenviar em ${resendCooldown}s`}
        </button>
        <button type="button" className="primary-action" disabled={!canConfirm} onClick={onConfirm}>
          {isConfirming ? "Confirmando..." : "Confirmar e listar"}
        </button>
      </div>
    </section>
  );
}
