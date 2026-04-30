type HomeMobileProfileSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function HomeMobileProfileSheet({ open, onClose }: HomeMobileProfileSheetProps) {
  return (
    <div
      className={["home-mobile-profile-sheet", open ? "home-mobile-profile-sheet--open" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="home-mobile-profile-sheet__backdrop"
        onClick={onClose}
        aria-label="Fechar perfil"
      />

      <section className="home-mobile-profile-sheet__panel" role="dialog" aria-modal="true" aria-label="Perfil do usuário">
        <header className="home-mobile-profile-sheet__header">
          <div>
            <span>Perfil</span>
            <strong>Editar perfil</strong>
          </div>
          <button type="button" className="home-mobile-profile-sheet__close" onClick={onClose} aria-label="Fechar perfil">×</button>
        </header>

        <div className="home-mobile-profile-sheet__body">
          <p>Área de perfil ainda não configurada.</p>
          <small>Esse painel já está preparado para receber os campos de edição do usuário.</small>
        </div>
      </section>
    </div>
  );
}
