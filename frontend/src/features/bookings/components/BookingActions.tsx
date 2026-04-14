type BookingActionsProps = {
  editing: boolean;
  confirmingDelete: boolean;
  canSave: boolean;
  canManage: boolean;
  disableReason?: string;
  isSaving: boolean;
  isDeleting: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
};

export function BookingActions({
  editing,
  confirmingDelete,
  canSave,
  canManage,
  disableReason,
  isSaving,
  isDeleting,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: BookingActionsProps) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {disableReason ? <small style={{ color: "#b45309" }}>{disableReason}</small> : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {!editing ? (
          <button type="button" className="secondary-action" onClick={onStartEdit} disabled={!canManage || confirmingDelete}>
            Editar
          </button>
        ) : (
          <>
            <button type="button" className="secondary-action" onClick={onCancelEdit} disabled={isSaving}>
              Cancelar edição
            </button>
            <button type="button" className="primary-action" disabled={!canSave || isSaving} onClick={onSave}>
              {isSaving ? "Salvando..." : "Salvar alterações"}
            </button>
          </>
        )}

        {!confirmingDelete ? (
          <button
            type="button"
            className="secondary-action"
            disabled={!canManage || isDeleting || editing}
            onClick={onAskDelete}
            style={{ borderColor: "rgba(220,38,38,.35)", color: "#b91c1c" }}
          >
            Cancelar agendamento
          </button>
        ) : null}
      </div>

      {confirmingDelete ? (
        <div
          style={{
            border: "1px solid rgba(220,38,38,.18)",
            borderRadius: 16,
            padding: 14,
            background: "rgba(254,242,242,.9)",
            display: "grid",
            gap: 10,
          }}
        >
          <strong>Confirmar cancelamento</strong>
          <span style={{ fontSize: 14, opacity: 0.8 }}>
            Essa ação remove o agendamento. Você só pode cancelar com pelo menos 2 horas de antecedência.
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" className="secondary-action" onClick={onCancelDelete} disabled={isDeleting}>
              Voltar
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={onDelete}
              disabled={isDeleting}
              style={{ background: "#b91c1c", borderColor: "#b91c1c" }}
            >
              {isDeleting ? "Cancelando..." : "Confirmar cancelamento"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
