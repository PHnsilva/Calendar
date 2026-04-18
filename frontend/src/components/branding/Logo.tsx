import logo from "../../assets/brand/logo.png";

export default function Logo() {
  return (
    <div className="brand-lockup__inner">
      <span className="brand-lockup__media" aria-hidden="true">
        <img
          src={logo}
          alt=""
          className="brand-lockup__logo"
        />
      </span>

      <span className="brand-lockup__copy">
        <strong>SG Pequenos Reparos</strong>
        <small>Agendamentos</small>
      </span>
    </div>
  );
}
