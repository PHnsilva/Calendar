import logoWithName from "../../assets/brand/logowithname.webp";

export default function Logo() {
  return (
    <div className="brand-lockup__inner">
      <span className="brand-lockup__media brand-lockup__media--with-name">
        <img
          src={logoWithName}
          alt="SG Pequenos Reparos Agendamentos"
          className="brand-lockup__logo brand-lockup__logo--with-name"
          width="400"
          height="171"
          decoding="async"
        />
      </span>
    </div>
  );
}
