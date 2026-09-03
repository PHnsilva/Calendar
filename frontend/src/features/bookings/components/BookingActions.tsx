import cancelIcon from "../../../assets/wireframes/icons/booking-action-cancel.svg";

type BookingActionsProps = {
  canManage: boolean;
  onCancel: () => void;
};

export function BookingActions({ canManage, onCancel }: BookingActionsProps) {
  return (
    <div className="booking-detail__actions">
      <button type="button" className="primary-action primary-action--danger" onClick={onCancel} disabled={!canManage}>
        <img src={cancelIcon} alt="" aria-hidden="true" />
        Cancelar
      </button>
    </div>
  );
}
