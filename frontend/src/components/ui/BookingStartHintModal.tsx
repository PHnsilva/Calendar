import AlertNotice from './AlertNotice';

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
        <AlertNotice
          variant="info"
          title="Selecione um dia disponível no calendário"
          actionLabel="Entendi"
          onAction={onClose}
          className="booking-start-banner__notice"
        >
          <p>Os dias liberados ficam em destaque enquanto este aviso estiver aberto.</p>
        </AlertNotice>
      </div>
    </div>
  );
}
