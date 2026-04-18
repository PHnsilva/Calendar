import { Link } from "react-router-dom";

export function RecoveryEmptyState() {
  return (
    <section className="recovery-card">
      <h2>Nenhum agendamento encontrado</h2>
      <p>Não encontramos atendimentos vinculados a esse telefone no período consultado.</p>
      <Link to="/" className="secondary-action">Voltar para agendar</Link>
    </section>
  );
}
