import { normalizeApiErrorMessage } from "../../../lib/errors";

type RecoveryStartModalProps = {
  phone: string;
  setPhone: (value: string) => void;
  onStart: () => void;
  disabled: boolean;
  isLoading: boolean;
  error?: Error | null;
};

export function RecoveryStartModal({ phone, setPhone, onStart, disabled, isLoading, error }: RecoveryStartModalProps) {
  return (
    <section className="recovery-card">
      <h2>Recuperar acesso aos seus agendamentos</h2>
      <p>Informe o telefone usado no agendamento. Vamos enviar um código para listar seus atendimentos e restaurar o acesso neste navegador.</p>
      <label>
        <span>Telefone</span>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(31) 99999-9999" inputMode="tel" />
      </label>
      {error ? <p className="recovery-card__error">{normalizeApiErrorMessage(error, { context: "recovery" })}</p> : null}
      <button type="button" className="primary-action" onClick={onStart} disabled={disabled}>
        {isLoading ? "Enviando..." : "Enviar código"}
      </button>
    </section>
  );
}
