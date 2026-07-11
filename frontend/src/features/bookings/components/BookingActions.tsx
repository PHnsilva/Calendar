type BookingActionsProps = {
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
};

export function BookingActions({ canManage, onEdit, onCancel }: BookingActionsProps) {
  return (
    <div className="booking-detail__actions">
      <button type="button" className="secondary-action" onClick={onEdit} disabled={!canManage}>
        Editar / reagendar
      </button>
      <button type="button" className="primary-action primary-action--danger" onClick={onCancel} disabled={!canManage}>
        Cancelar
      </button>
    </div>
  );
}
