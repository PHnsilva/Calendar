type AdminSelectionDockProps = {
  selectedCount: number;
  onBlock: () => void;
  onCancelBookings: () => void;
  onViewBookings: () => void;
  onClear: () => void;
};

function DockIcon({ kind }: { kind: 'block' | 'cancel' | 'view' | 'clear' }) {
  if (kind === 'block') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="5" y="9" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 9V7.5C8 5.57 9.57 4 11.5 4H12.5C14.43 4 16 5.57 16 7.5V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === 'cancel') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M8 8L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === 'view') {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3.5 12C5.5 8.5 8.4 6.75 12 6.75C15.6 6.75 18.5 8.5 20.5 12C18.5 15.5 15.6 17.25 12 17.25C8.4 17.25 5.5 15.5 3.5 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
        <small>Revise antes de aplicar ações em lote.</small>
      </div>

      <div className="admin-selection-dock__actions">
        <button type="button" className="admin-selection-dock__button admin-selection-dock__button--primary" onClick={onBlock}>
          <span className="admin-selection-dock__button-icon"><DockIcon kind="block" /></span>
          <span>Bloquear</span>
        </button>
        <button type="button" className="admin-selection-dock__button" onClick={onCancelBookings}>
          <span className="admin-selection-dock__button-icon"><DockIcon kind="cancel" /></span>
          <span>Cancelar</span>
        </button>
        <button type="button" className="admin-selection-dock__button" onClick={onViewBookings}>
          <span className="admin-selection-dock__button-icon"><DockIcon kind="view" /></span>
          <span>Agendamentos</span>
        </button>
        <button type="button" className="admin-selection-dock__button admin-selection-dock__button--ghost" onClick={onClear}>
          <span className="admin-selection-dock__button-icon"><DockIcon kind="clear" /></span>
          <span>Limpar</span>
        </button>
      </div>
    </div>
  );
}
