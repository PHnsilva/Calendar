type AdminSelectionDockProps = {
  selectedCount: number;
  onBlock: () => void;
  onCancelBookings: () => void;
  onViewBookings: () => void;
  onClear: () => void;
};

export default function AdminSelectionDock({
  selectedCount,
  onBlock,
  onCancelBookings,
  onViewBookings,
  onClear,
}: AdminSelectionDockProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="admin-selection-dock" role="toolbar" aria-label="Ações para os dias selecionados">
      <div className="admin-selection-dock__summary">
        <span className="admin-selection-dock__eyebrow">Seleção ativa</span>
        <strong>{selectedCount} {selectedCount === 1 ? 'dia selecionado' : 'dias selecionados'}</strong>
      </div>

      <div className="admin-selection-dock__actions">
        <button type="button" className="admin-selection-dock__button admin-selection-dock__button--primary" onClick={onBlock}>
          Bloquear
        </button>
        <button type="button" className="admin-selection-dock__button" onClick={onCancelBookings}>
          Cancelar
        </button>
        <button type="button" className="admin-selection-dock__button" onClick={onViewBookings}>
          Agendamentos
        </button>
        <button type="button" className="admin-selection-dock__button admin-selection-dock__button--ghost" onClick={onClear}>
          Limpar
        </button>
      </div>
    </div>
  );
}
