import type { RecoverConfirmResponse } from "../../../types/api";

type RecoverySuccessStateProps = {
  response: RecoverConfirmResponse;
  onOpenMyBookings: () => void;
};

export function RecoverySuccessState({ response, onOpenMyBookings }: RecoverySuccessStateProps) {
  return (
    <section style={{ display: "grid", gap: 12, border: "1px solid rgba(15,23,42,.12)", borderRadius: 20, padding: 18, background: "white" }}>
      <h2 style={{ margin: 0 }}>Agendamentos encontrados</h2>
      <p style={{ margin: 0, opacity: 0.8 }}>{response.items.length} agendamento(s) recuperado(s).</p>
      <div style={{ display: "grid", gap: 10 }}>
        {response.items.map((item) => (
          <div key={item.servico.eventId} style={{ border: "1px solid rgba(15,23,42,.08)", borderRadius: 14, padding: 12 }}>
            <strong>{item.servico.serviceType}</strong>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>{item.servico.clientCity}</div>
            <div style={{ fontSize: 14, opacity: 0.75, marginTop: 4 }}>{new Date(item.servico.start).toLocaleString("pt-BR")}</div>
          </div>
        ))}
      </div>
      <button type="button" className="primary-action" onClick={onOpenMyBookings}>
        Abrir meus agendamentos
      </button>
    </section>
  );
}
