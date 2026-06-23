import ClientNavbar from "../../components/layout/ClientNavbar";

type PublicNavbarProps = {
  onConfirmPhone?: () => void;
  onCreate?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
};

export function PublicNavbar(props: PublicNavbarProps) {
  return <ClientNavbar {...props} />;
}

export default PublicNavbar;
