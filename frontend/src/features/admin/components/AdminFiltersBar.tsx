import type { AdminFilters } from "../types";

type AdminFiltersBarProps = {
  filters: AdminFilters;
  onChange: <K extends keyof AdminFilters>(key: K, value: AdminFilters[K]) => void;
  onReset: () => void;
};

export default function AdminFiltersBar({ filters, onChange, onReset }: AdminFiltersBarProps) {
  return (
    <section className="admin-filters panel">
      <div className="admin-filters__row admin-filters__row--search">
        <label className="admin-field admin-field--grow">
          <span>Buscar</span>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => onChange("search", event.target.value)}
            placeholder="Nome, telefone, e-mail ou endereço"
          />
        </label>
      </div>

      <div className="admin-filters__row">
        <label className="admin-field">
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) => onChange("status", event.target.value)}
          >
            <option value="">Todos</option>
            <option value="PENDING">Pendente</option>
            <option value="CONFIRMED">Confirmado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="COMPLETED">Concluído</option>
          </select>
        </label>

        <label className="admin-field">
          <span>Cidade</span>
          <input
            type="text"
            value={filters.city}
            onChange={(event) => onChange("city", event.target.value)}
            placeholder="Filtrar cidade"
          />
        </label>

        <label className="admin-field">
          <span>De</span>
          <input
            type="date"
            value={filters.from}
            onChange={(event) => onChange("from", event.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Até</span>
          <input
            type="date"
            value={filters.to}
            onChange={(event) => onChange("to", event.target.value)}
          />
        </label>
      </div>

      <div className="admin-filters__actions">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={onReset}>
          Limpar filtros
        </button>
      </div>
    </section>
  );
}
