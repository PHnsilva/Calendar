import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../../../../assets/brand/logowithname.png";
import clientCreateCalendarIcon from "../../../../assets/wireframes/icons/client-create-calendar.png";
import clientFollowCalendarIcon from "../../../../assets/wireframes/icons/client-follow-calendar.png";
import clientPhoneIcon from "../../../../assets/wireframes/icons/client-phone.png";
import clientChatIcon from "../../../../assets/wireframes/icons/client-chat.png";
import footerWhatsAppWireframeIcon from "../../../../assets/wireframes/icons/footer-whatsapp-wireframe.png";
import footerInstagramWireframeIcon from "../../../../assets/wireframes/icons/footer-instagram-wireframe.png";
import footerEmailWireframeIcon from "../../../../assets/wireframes/icons/footer-email-wireframe.png";
import footerPhoneWireframeIcon from "../../../../assets/wireframes/icons/footer-phone-wireframe.png";
import footerMapWireframeIcon from "../../../../assets/wireframes/icons/footer-map-wireframe.png";
import { SvgWrapper } from "../../../../components/layout/ResponsivePrimitives";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function LandingIcon({ name }: { name: string }) {
  const imageIcons: Record<string, string> = {
    "calendar-create": clientCreateCalendarIcon,
    "calendar-clock": clientFollowCalendarIcon,
    "mobile-phone": clientPhoneIcon,
    "chat-bubbles": clientChatIcon,
    "footer-whatsapp-social": footerWhatsAppWireframeIcon,
    "footer-instagram-social": footerInstagramWireframeIcon,
    "footer-email-social": footerEmailWireframeIcon,
    "footer-phone-wireframe": footerPhoneWireframeIcon,
    "footer-map-wireframe": footerMapWireframeIcon,
  };
  const imageIcon = imageIcons[name];
  if (imageIcon) {
    return (
      <SvgWrapper className={cx("wf-icon", "wf-icon--image", `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, "-")}`)}>
        <img src={imageIcon} alt="" />
      </SvgWrapper>
    );
  }

  const common = { viewBox: "0 0 64 64", fill: "none", xmlns: "http://www.w3.org/2000/svg", "aria-hidden": true } as const;
  const line = { stroke: "currentColor", strokeWidth: 4.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  const icons: Record<string, ReactNode> = {
    calendar: <svg {...common}><rect x="12" y="14" width="40" height="38" rx="8" {...line}/><path d="M22 8v12M42 8v12M12 25h40" {...line}/><path d="M22 35h.01M32 35h.01M42 35h.01M22 44h.01M32 44h.01M42 44h.01" {...line}/></svg>,
    play: <svg {...common}><circle cx="32" cy="32" r="27" fill="#ff1d16"/><path d="M27 21 46 32 27 43V21Z" fill="#fff"/></svg>,
    user: <svg {...common}><circle cx="32" cy="22" r="10" {...line}/><path d="M14 55c3.7-12.2 9.7-18.3 18-18.3S46.3 42.8 50 55" {...line}/></svg>,
  };

  return <SvgWrapper className={cx("wf-icon", `wf-icon--${name.replace(/[^a-zA-Z0-9-]/g, "-")}`)}>{icons[name] ?? icons.calendar}</SvgWrapper>;
}

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className={cx("wf-logo", compact && "wf-logo--compact")}>
      <img src={logo} alt="SG Pequenos Reparos Agendamentos" />
    </Link>
  );
}
