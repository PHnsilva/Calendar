export function RecoveryEmptyState() {
  return (
    <section style={{ display: "grid", gap: 12, border: "1px dashed rgba(15,23,42,.2)", borderRadius: 20, padding: 18, background: "white" }}>
      <h2 style={{ margin: 0 }}>Nenhum token salvo</h2>
      <p style={{ margin: 0, opacity: 0.8 }}>
        Use a recuperação por telefone para listar os agendamentos e restaurar os links de gerenciamento.
      </p>
    </section>
  );
}
