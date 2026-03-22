import logo from "../../assets/brand/logo.png";
export default function Logo() {
  return (
    <div className="brand-lockup__inner flex items-center gap-3">
      <img
        src={logo}
        alt="Logo SG Pequenos Reparos"
        className="h-12 w-12 object-contain"
      />

      <span className="brand-lockup__copy flex flex-col leading-tight">
        <strong className="text-sm font-semibold sm:text-base">
          SG Pequenos Reparos
        </strong>
        <small className="text-xs text-neutral-500 sm:text-sm">
          Agendamentos
        </small>
      </span>
    </div>
  );
}