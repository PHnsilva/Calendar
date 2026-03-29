import logo from "../../assets/brand/logo.png";
export default function Logo() {
  return (
    <div className="brand-lockup__inner flex items-center gap-3">
      <img
        src={logo}
        alt="Logo SG Pequenos Reparos"
        className="h-12 w-12 object-contain"
      />

      <span className="brand-lockup__copy">
        <strong>SG Pequenos Reparos</strong>
        <small>Agendamentos</small>
      </span>
    </div>
  );
}
