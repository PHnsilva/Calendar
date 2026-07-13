import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../../../../assets/brand/logowithname.png";
import clientPhoneIcon from "../../../../assets/wireframes/icons/client-phone.png";
import actionCreateCalendarIcon from "../../../../assets/wireframes/icons/action-create-calendar.png";
import actionFollowClipboardClockIcon from "../../../../assets/wireframes/icons/action-follow-clipboard-clock.png";
import actionProfileUserIcon from "../../../../assets/wireframes/icons/action-profile-user.png";
import actionContactChatIcon from "../../../../assets/wireframes/icons/action-contact-chat.png";
import footerWhatsAppWireframeIcon from "../../../../assets/wireframes/icons/footer-whatsapp-wireframe.png";
import footerInstagramWireframeIcon from "../../../../assets/wireframes/icons/footer-instagram-wireframe.png";
import footerEmailWireframeIcon from "../../../../assets/wireframes/icons/footer-email-wireframe.png";
import footerPhoneWireframeIcon from "../../../../assets/footer/contact-phone-chat-green.svg";
import footerMapWireframeIcon from "../../../../assets/footer/contact-location-red.svg";
import { SvgWrapper } from "../../../../components/layout/ResponsivePrimitives";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function LandingIcon({ name }: { name: string }) {
  const imageIcons: Record<string, string> = {
    "calendar-create": actionCreateCalendarIcon,
    "calendar-clock": actionFollowClipboardClockIcon,
    "mobile-phone": clientPhoneIcon,
    "user": actionProfileUserIcon,
    "chat-bubbles": actionContactChatIcon,
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
    services: <svg {...common}><path d="M17 16h30a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5Z" fill="currentColor" opacity="0.98"/><path d="M22 26h20M22 34h16M22 42h12" stroke="#07135d" strokeWidth="4.8" strokeLinecap="round"/><path d="M43.5 39.5a6.5 6.5 0 1 0 8.9 8.9l-3.6-3.6-2.3 2.3-2.2-2.2 2.3-2.3-3.1-3.1Z" fill="#ff4b0b"/><path d="m47.4 47.1 7.2 7.2" stroke="#ff4b0b" strokeWidth="4.6" strokeLinecap="round"/></svg>,
    user: <svg {...common}><circle cx="32" cy="32" r="27" fill="currentColor" opacity="0.16"/><circle cx="32" cy="24" r="10.5" fill="currentColor"/><path d="M14 55c2.7-12.5 9.1-18.8 18-18.8S47.3 42.5 50 55" fill="currentColor"/><path d="M15.5 55c3.2-11.3 8.9-17 16.5-17s13.3 5.7 16.5 17" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.45"/></svg>,
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
