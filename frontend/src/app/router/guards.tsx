import { isSiteHoldingPageEnabled } from "../../lib/holding-mode";

export function shouldRenderHoldingPage() {
  return isSiteHoldingPageEnabled();
}
