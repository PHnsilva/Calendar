import type { AdminDashboardSummaryResponse } from "../../../types/booking";

type AdminQuickStatsProps = {
  summary: AdminDashboardSummaryResponse;
  loading?: boolean;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function AdminQuickStats({ summary, loading }: AdminQuickStatsProps) {
  const items = [
    { label: "Total", value: summary.totalBookings },
    { label: "Pendentes", value: summary.pendingBookings },
    { label: "Confirmados", value: summary.confirmedBookings },
    { label: "Outros", value: summary.otherBookings },
    { label: "Bloqueios", value: summary.totalBlocks },
    {
      label: "Financeiro",
      value: currencyFormatter.format((summary.totalAmountCents ?? 0) / 100),
    },
  ];

  return (
    <section className="admin-stats-grid">
      {items.map((item) => (
        <article key={item.label} className="admin-stat-card panel">
          <span className="admin-stat-card__label">{item.label}</span>
          <strong className="admin-stat-card__value">{loading ? "..." : item.value}</strong>
        </article>
      ))}
    </section>
  );
}
