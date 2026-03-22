type BookingStartHintModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function BookingStartHintModal({
  open,
  onClose,
}: BookingStartHintModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="booking-start-banner" role="dialog" aria-label="Aviso de seleção de data">
      <div className="booking-start-banner__card">
        <div className="booking-start-banner__content">
          <span className="booking-start-banner__eyebrow">Novo agendamento</span>
          <strong className="booking-start-banner__title">
            Selecione um dia disponível no calendário.
          </strong>
          <p className="booking-start-banner__text">
            Os dias liberados estão em destaque enquanto este aviso estiver aberto.
          </p>
        </div>

        <button
          type="button"
          className="secondary-action booking-start-banner__action"
          onClick={onClose}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
