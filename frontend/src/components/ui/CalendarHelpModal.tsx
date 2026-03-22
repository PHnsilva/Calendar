import { useEffect } from "react";

type CalendarHelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function CalendarHelpModal({
  open,
  onClose,
}: CalendarHelpModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="help-modal" role="dialog" aria-modal="true">
      <button
        type="button"
        className="help-modal__backdrop"
        onClick={onClose}
        aria-label="Fechar ajuda"
      />

      <div className="help-modal__card">
        <div className="help-modal__header">
          <div>
            <span className="help-modal__eyebrow">Ajuda</span>
            <h3 className="help-modal__title">Como usar o calendário</h3>
          </div>

          <button
            type="button"
            className="help-modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="help-modal__body">
          <div className="help-tip">
            <strong>Selecionar um dia</strong>
            <p>Clique em um dia disponível para destacar a data.</p>
          </div>

          <div className="help-tip">
            <strong>Agendar com um dia selecionado</strong>
            <p>
              Depois de selecionar um dia disponível, use o botão “Agendar” que
              aparece dentro do próprio bloco.
            </p>
          </div>

          <div className="help-tip">
            <strong>Agendamento direto</strong>
            <p>
              O botão “Agendamentos” no topo e o botão “+” da lateral já abrem o
              modal imediatamente.
            </p>
          </div>

          <div className="help-tip">
            <strong>Meses disponíveis</strong>
            <p>
              Só o mês atual e o próximo ficam liberados. O preview bloqueado
              fica apagado e com cursor de indisponível.
            </p>
          </div>

          <div className="help-tip">
            <strong>Dias indisponíveis</strong>
            <p>
              Dias bloqueados aparecem apagados e não aceitam agendamento.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}