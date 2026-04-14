type BookingActionsProps = {
  editing: boolean;
  canSave: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export function BookingActions({
  editing,
  canSave,
  isSaving,
  isDeleting,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: BookingActionsProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {!editing ? (
        <button type="button" className="secondary-action" onClick={onStartEdit}>
          Editar
        </button>
      ) : (
        <>
          <button type="button" className="secondary-action" onClick={onCancelEdit}>
            Cancelar edição
          </button>
          <button type="button" className="primary-action" disabled={!canSave || isSaving} onClick={onSave}>
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </button>
        </>
      )}

      <button
        type="button"
        className="secondary-action"
        disabled={isDeleting}
        onClick={onDelete}
        style={{ borderColor: "rgba(220,38,38,.35)", color: "#b91c1c" }}
      >
        {isDeleting ? "Cancelando..." : "Cancelar agendamento"}
      </button>
    </div>
  );
}
