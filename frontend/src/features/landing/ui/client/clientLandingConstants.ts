import { trackEvent } from "../../../../lib/analytics";
import { buildBusinessWhatsAppUrl, getBusinessWhatsAppNumber } from "../../../../lib/support-contact";

export const supportPhoneDisplay = "(31) 9541-5323";
export const supportPhoneDigits = getBusinessWhatsAppNumber();
export const supportWhatsAppUrl = buildBusinessWhatsAppUrl();
export const supportInstagramUrl = "https://www.instagram.com/sg_pequenos_reparos/";
export const supportEmail = "sgpequenosreparos@gmail.com";
export const serviceCitiesLabel = "Itabirito, Ouro Preto, Moeda, Belo Horizonte e Nova Lima";

export function openExternal(url: string) {
  if (url.includes("wa.me")) trackEvent("whatsapp_click");
  if (url.includes("instagram.com")) trackEvent("instagram_click");
  window.open(url, "_blank", "noopener,noreferrer");
}
