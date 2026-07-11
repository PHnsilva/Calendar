import editIcon from "../../../assets/wireframes/icons/booking-action-pencil.svg";
import cancelIcon from "../../../assets/wireframes/icons/booking-action-cancel.svg";

type BookingActionsProps = {
  canManage: boolean;
  onEdit: () => void;
  onCancel: () => void;
};

export function BookingActions({ canManage, onEdit, onCancel }: BookingActionsProps) {
  return (
    <div className="booking-detail__actions">
      <button type="button" className="secondary-action" onClick={onEdit} disabled={!canManage}>
        <img src={editIcon} alt="" aria-hidden="true" />
        Editar / reagendar
      </button>
      <button type="button" className="primary-action primary-action--danger" onClick={onCancel} disabled={!canManage}>
        <img src={cancelIcon} alt="" aria-hidden="true" />
        Cancelar
      </button>
    </div>
  );
}
