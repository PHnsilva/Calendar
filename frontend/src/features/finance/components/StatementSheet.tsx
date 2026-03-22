import { useQuery } from "@tanstack/react-query";
import { getFinanceHealth } from "../api/get-finance-health";
import { getStatement } from "../api/get-statement";

function formatCurrencyFromText(amount: string) {
  return amount || "R$ 0,00";
}

type StatementSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function StatementSheet({ open, onClose }: StatementSheetProps) {
  const statementQuery = useQuery({
    queryKey: ["admin", "finance", "statement"],
    queryFn: () => getStatement(),
    enabled: open,
  });

  const healthQuery = useQuery({
    queryKey: ["admin", "finance", "health"],
    queryFn: getFinanceHealth,
    enabled: open,
  });

  if (!open) return null;

  const items = statementQuery.data?.items ?? [];

  return (
    <div className="bottom-sheet" role="dialog" aria-modal="true">
      <button type="button" className="bottom-sheet__backdrop" onClick={onClose} aria-label="Fechar extrato" />
      <section className="bottom-sheet__panel">
        <div className="bottom-sheet__handle" aria-hidden="true" />
        <header className="bottom-sheet__header">
          <div>
            <span className="timeline-panel__eyebrow">Admin</span>
            <h3 className="bottom-sheet__title">Extrato</h3>
          </div>
          <button type="button" className="bottom-sheet__close" onClick={onClose}>Fechar</button>
        </header>

        <div className="bottom-sheet__health">
          <strong>{healthQuery.data?.ok ? "Financeiro online" : "Financeiro pendente"}</strong>
          <span>{healthQuery.data?.provider ?? "Provider não informado"}</span>
          <small>{healthQuery.data?.message ?? "Sem mensagem no momento."}</small>
        </div>

        <div className="bottom-sheet__body">
          {statementQuery.isLoading ? <div className="timeline-card timeline-card--empty"><strong>Carregando extrato</strong></div> : null}
          {!statementQuery.isLoading && items.length === 0 ? (
            <div className="timeline-card timeline-card--empty">
              <strong>Sem lançamentos</strong>
              <span>Nenhum item retornado pelo backend.</span>
            </div>
          ) : null}

          {items.map((item) => (
            <article key={item.id} className="bottom-sheet__entry">
              <div>
                <strong>{item.description}</strong>
                <p>{item.date}</p>
              </div>
              <div className="bottom-sheet__entry-meta bottom-sheet__entry-meta--amount">
                <strong>{formatCurrencyFromText(item.amount)}</strong>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
