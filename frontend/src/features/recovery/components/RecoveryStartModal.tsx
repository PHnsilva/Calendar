type RecoveryStartModalProps = {
  phone: string;
  onPhoneChange: (value: string) => void;
  onStart: () => void;
  canStart: boolean;
  isStarting: boolean;
};

export function RecoveryStartModal({ phone, onPhoneChange, onStart, canStart, isStarting }: RecoveryStartModalProps) {
  return (
    <section style={{ display: "grid", gap: 12, border: "1px solid rgba(15,23,42,.12)", borderRadius: 20, padding: 18, background: "white" }}>
      <h2 style={{ margin: 0 }}>Recuperar agendamentos</h2>
      <p style={{ margin: 0, opacity: 0.8 }}>Informe o mesmo telefone usado no agendamento para receber o código.</p>
      <label style={{ display: "grid", gap: 6 }}>
        <span>Telefone</span>
        <input
          className="booking-form__input"
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
          placeholder="(31) 99999-9999"
          inputMode="tel"
        />
      </label>
      <button type="button" className="primary-action" disabled={!canStart} onClick={onStart}>
        {isStarting ? "Enviando..." : "Enviar código"}
      </button>
    </section>
  );
}
